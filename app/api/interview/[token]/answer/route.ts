import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_sessions, interview_invites, jobs, app_settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateNextQuestion, type TranscriptItem } from "@/lib/ai/gemini";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const { sessionId, question, answer } = await req.json();

    const [session] = await db.select().from(interview_sessions).where(eq(interview_sessions.id, sessionId));
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const [invite] = await db.select().from(interview_invites).where(eq(interview_invites.id, session.invite_id));
    const [job] = await db.select().from(jobs).where(eq(jobs.id, session.job_id));
    const [settings] = await db.select().from(app_settings)
        .where(eq(app_settings.recruiter_id, invite?.recruiter_id || ""));

    // Build updated transcript
    const existingTranscript = (session.transcript as TranscriptItem[]) || [];
    const updatedTranscript: TranscriptItem[] = [
        ...existingTranscript,
        { role: "ai", text: question, timestamp: new Date().toISOString() },
        { role: "candidate", text: answer, timestamp: new Date().toISOString() },
    ];

    const questionsAnswered = session.questions_answered + 1;
    const isComplete = questionsAnswered >= session.total_questions;

    // Generate next question or end
    let nextQuestion: string | null = null;
    if (!isComplete) {
        nextQuestion = await generateNextQuestion({
            jobTitle: job?.title || "the role",
            jobDescription: job?.description || "",
            companyName: settings?.company_name || "our company",
            interviewType: invite?.interview_type || "screening",
            questionCount: session.total_questions,
            customPrompt: settings?.custom_ai_prompt || undefined,
            interviewerName: settings?.ai_interviewer_name || "Alex",
            tone: settings?.interview_tone || "professional",
            transcript: updatedTranscript,
        });
        if (nextQuestion) {
            updatedTranscript.push({ role: "ai" as const, text: nextQuestion, timestamp: new Date().toISOString() });
        }
    }

    // Update session
    await db.update(interview_sessions).set({
        transcript: updatedTranscript,
        questions_answered: questionsAnswered,
    }).where(eq(interview_sessions.id, sessionId));

    return NextResponse.json({
        next_question: nextQuestion,
        is_complete: isComplete || !nextQuestion,
        questions_answered: questionsAnswered,
    });
}
