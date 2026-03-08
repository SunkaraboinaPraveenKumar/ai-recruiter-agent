import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_invites, candidates, jobs, app_settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const [invite] = await db.select({
        invite: interview_invites,
        candidate: { id: candidates.id, email: candidates.email, full_name: candidates.full_name },
        job: { id: jobs.id, title: jobs.title, description: jobs.description },
    })
        .from(interview_invites)
        .innerJoin(candidates, eq(interview_invites.candidate_id, candidates.id))
        .innerJoin(jobs, eq(interview_invites.job_id, jobs.id))
        .where(eq(interview_invites.interview_link, token));

    if (!invite) {
        return NextResponse.json({ error: "Invalid or expired interview link" }, { status: 404 });
    }

    // Check expiry
    if (new Date(invite.invite.expires_at) < new Date()) {
        return NextResponse.json({ error: "This interview link has expired" }, { status: 410 });
    }

    if (invite.invite.status === "completed") {
        return NextResponse.json({ error: "This interview has already been completed" }, { status: 409 });
    }

    // Get settings for this recruiter
    const [settings] = await db.select().from(app_settings)
        .where(eq(app_settings.recruiter_id, invite.invite.recruiter_id));

    const interviewType = invite.invite.interview_type;
    const questionCount = interviewType === "technical"
        ? (settings?.technical_question_count ?? 6)
        : interviewType === "hr_final"
            ? (settings?.hr_question_count ?? 4)
            : (settings?.screening_question_count ?? 5);

    return NextResponse.json({
        jobTitle: invite.job.title,
        companyName: settings?.company_name || "The Company",
        interviewType,
        candidateEmail: invite.candidate.email,
        estimatedDuration: `${questionCount * 3}–${questionCount * 5} minutes`,
        questionCount,
        silenceTimeout: settings?.silence_timeout_seconds ?? 3,
        aiName: settings?.ai_interviewer_name || "Alex",
        voiceId: settings?.ai_voice_id || "en-US-Neural2-F",
        inviteId: invite.invite.id,
        jobDescription: invite.job.description,
        customPrompt: settings?.custom_ai_prompt,
        tone: settings?.interview_tone || "professional",
    });
}
