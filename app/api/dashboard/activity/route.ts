import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, candidates, interview_invites, interview_sessions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const recruiterId = user!.userId;

    // Fetch recent items from all relevant tables
    const [recentJobs, recentCandidates, recentInvites, recentSessions] = await Promise.all([
        db.select({ id: jobs.id, title: jobs.title, created_at: jobs.created_at })
            .from(jobs).where(eq(jobs.recruiter_id, recruiterId)).orderBy(desc(jobs.created_at)).limit(5),

        db.select({ id: candidates.id, full_name: candidates.full_name, created_at: candidates.created_at })
            .from(candidates).where(eq(candidates.recruiter_id, recruiterId)).orderBy(desc(candidates.created_at)).limit(5),

        db.select({
            id: interview_invites.id,
            candidate_id: interview_invites.candidate_id,
            created_at: interview_invites.created_at,
            email_sent_at: interview_invites.email_sent_at,
        }).from(interview_invites).where(eq(interview_invites.recruiter_id, recruiterId))
            .orderBy(desc(interview_invites.created_at)).limit(5),

        db.select({
            id: interview_sessions.id,
            candidate_name: interview_sessions.candidate_name,
            completed_at: interview_sessions.completed_at,
        }).from(interview_sessions)
            .innerJoin(interview_invites, eq(interview_sessions.invite_id, interview_invites.id))
            .where(eq(interview_invites.recruiter_id, recruiterId))
            .orderBy(desc(interview_sessions.completed_at)).limit(5),
    ]);

    // Combine and sort all events
    const events = [
        ...recentJobs.map(j => ({
            type: "job_created" as const,
            id: j.id,
            description: `New job posted: ${j.title}`,
            timestamp: j.created_at,
        })),
        ...recentCandidates.map(c => ({
            type: "candidate_added" as const,
            id: c.id,
            description: `${c.full_name} added to candidates`,
            timestamp: c.created_at,
        })),
        ...recentInvites.map(i => ({
            type: "invite_sent" as const,
            id: i.id,
            description: `Interview invite sent`,
            timestamp: i.email_sent_at || i.created_at,
        })),
        ...recentSessions.filter(s => s.completed_at).map(s => ({
            type: "interview_completed" as const,
            id: s.id,
            description: `${s.candidate_name} completed an interview`,
            timestamp: s.completed_at!,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return NextResponse.json({ events });
}
