import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_invites, interview_sessions, jobs, app_settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateNextQuestion, type TranscriptItem } from "@/lib/ai/gemini";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const { candidateName } = await req.json();

    const [invite] = await db.select()
        .from(interview_invites)
        .where(eq(interview_invites.interview_link, token));

    if (!invite) {
        return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, invite.job_id));
    const [settings] = await db.select().from(app_settings)
        .where(eq(app_settings.recruiter_id, invite.recruiter_id));

    const interviewType = invite.interview_type;
    const questionCount = interviewType === "technical"
        ? (settings?.technical_question_count ?? 6)
        : interviewType === "hr_final"
            ? (settings?.hr_question_count ?? 4)
            : (settings?.screening_question_count ?? 5);

    // Generate first question
    const firstQuestion = await generateNextQuestion({
        jobTitle: job?.title || "the role",
        jobDescription: job?.description || "",
        companyName: settings?.company_name || "our company",
        interviewType,
        questionCount,
        customPrompt: settings?.custom_ai_prompt || undefined,
        interviewerName: settings?.ai_interviewer_name || "Alex",
        tone: settings?.interview_tone || "professional",
        transcript: [] as TranscriptItem[],
    });

    // Create session
    const [session] = await db.insert(interview_sessions).values({
        invite_id: invite.id,
        candidate_name: candidateName,
        job_id: invite.job_id,
        candidate_id: invite.candidate_id,
        total_questions: questionCount,
        questions_answered: 0,
        transcript: [],
    }).returning();

    // Mark invite as accepted
    await db.update(interview_invites).set({ status: "accepted" }).where(eq(interview_invites.id, invite.id));

    return NextResponse.json({
        sessionId: session.id,
        firstQuestion,
        questionCount,
        silenceTimeout: settings?.silence_timeout_seconds ?? 3,
        voiceId: settings?.ai_voice_id || "en-US-Neural2-F",
    });
}
