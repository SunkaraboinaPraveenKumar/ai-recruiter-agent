import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, candidates, job_candidate_matches } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, and } from "drizzle-orm";
import { matchCandidatesToJob } from "@/lib/ai/gemini";
import { interview_invites } from "@/lib/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, response } = requireAuth(req);
    if (response) return response;
    const { id } = await params;

    try {
        // Get job
        const [job] = await db.select().from(jobs)
            .where(and(eq(jobs.id, id), eq(jobs.recruiter_id, user!.userId)));
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Get all candidates for this recruiter
        const allCandidates = await db.select().from(candidates)
            .where(eq(candidates.recruiter_id, user!.userId));

        if (allCandidates.length === 0) {
            return NextResponse.json({ error: "No candidates found. Add candidates first." }, { status: 400 });
        }

        // Get existing invites for this job
        const existingInvites = await db.select().from(interview_invites)
            .where(eq(interview_invites.job_id, id));

        const invitedCandidateIds = new Set(existingInvites.map(i => i.candidate_id));

        // Filter out candidates who already have an invite for this job
        const availableCandidates = allCandidates.filter(c => !invitedCandidateIds.has(c.id));

        if (availableCandidates.length === 0) {
            return NextResponse.json({ matches: [] }); // Or an error, but empty array is cleaner
        }

        // Run AI matching
        const matches = await matchCandidatesToJob(job, availableCandidates);

        // Save matches to DB (upsert)
        for (const match of matches) {
            await db.delete(job_candidate_matches)
                .where(and(
                    eq(job_candidate_matches.job_id, id),
                    eq(job_candidate_matches.candidate_id, match.candidate_id)
                ));
            await db.insert(job_candidate_matches).values({
                job_id: id,
                candidate_id: match.candidate_id,
                match_score: match.match_score,
                match_reason: match.match_reason,
            });
        }

        // Return matches with candidate details
        const enriched = await Promise.all(
            matches.map(async (m) => {
                const candidate = allCandidates.find(c => c.id === m.candidate_id);
                return { ...m, candidate };
            })
        );

        return NextResponse.json({ matches: enriched });
    } catch (error) {
        console.error("Match error:", error);
        return NextResponse.json({ error: "Matching failed" }, { status: 500 });
    }
}
