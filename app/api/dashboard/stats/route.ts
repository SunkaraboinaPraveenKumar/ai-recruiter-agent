import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, candidates, interview_invites, interview_sessions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const recruiterId = user!.userId;

    const [activeJobsResult] = await db
        .select({ count: count() })
        .from(jobs)
        .where(and(eq(jobs.recruiter_id, recruiterId), eq(jobs.status, "active")));

    const [totalCandidatesResult] = await db
        .select({ count: count() })
        .from(candidates)
        .where(eq(candidates.recruiter_id, recruiterId));

    const [totalInvitesResult] = await db
        .select({ count: count() })
        .from(interview_invites)
        .where(eq(interview_invites.recruiter_id, recruiterId));

    const [completedInterviewsResult] = await db
        .select({ count: count() })
        .from(interview_invites)
        .where(and(eq(interview_invites.recruiter_id, recruiterId), eq(interview_invites.status, "completed")));

    const totalInvites = totalInvitesResult.count;
    const completed = completedInterviewsResult.count;
    const screeningRate = totalInvites > 0 ? Math.round((completed / totalInvites) * 100) : 0;

    return NextResponse.json({
        activeJobs: activeJobsResult.count,
        totalCandidates: totalCandidatesResult.count,
        interviewsSent: totalInvites,
        screeningRate,
    });
}
