import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_invites, candidates, jobs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    const invites = await db
        .select({
            invite: interview_invites,
            candidate: {
                id: candidates.id,
                full_name: candidates.full_name,
                email: candidates.email,
                current_role: candidates.current_role,
            },
            job: {
                id: jobs.id,
                title: jobs.title,
            },
        })
        .from(interview_invites)
        .innerJoin(candidates, eq(interview_invites.candidate_id, candidates.id))
        .innerJoin(jobs, eq(interview_invites.job_id, jobs.id))
        .where(
            jobId
                ? and(eq(interview_invites.recruiter_id, user!.userId), eq(interview_invites.job_id, jobId))
                : eq(interview_invites.recruiter_id, user!.userId)
        )
        .orderBy(interview_invites.created_at);

    return NextResponse.json({ invites });
}
