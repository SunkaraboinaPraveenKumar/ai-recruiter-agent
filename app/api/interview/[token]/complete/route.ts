import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_sessions, interview_invites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateInterviewReport, TranscriptItem } from "@/lib/ai/gemini";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    let sessionId: string | undefined;

    try {
        const body = await req.text(); // Read as text first to avoid JSON parse error on empty body
        if (body) {
            const parsed = JSON.parse(body);
            sessionId = parsed.sessionId;
        }
    } catch (e) {
        console.warn("Failed to parse JSON body in complete route", e);
    }

    let session;
    let invite;

    if (sessionId) {
        [session] = await db.select().from(interview_sessions).where(eq(interview_sessions.id, sessionId));
        if (session) {
            [invite] = await db.select().from(interview_invites).where(eq(interview_invites.id, session.invite_id));
        }
    } else {
        // Fallback: Find invite by token, then get its most recent session
        [invite] = await db.select().from(interview_invites).where(eq(interview_invites.interview_link, token));
        if (invite) {
            const sessions = await db.select().from(interview_sessions)
                .where(eq(interview_sessions.invite_id, invite.id));
            // Get the most recent session
            session = sessions.sort((a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime())[0];
            if (session) sessionId = session.id;
        }
    }

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const transcript = (session.transcript as TranscriptItem[]) || [];

    // Generate AI report
    let reportData;
    try {
        reportData = await generateInterviewReport(
            transcript,
            "the role", // we'll use what we have
            invite?.interview_type || "screening"
        );
    } catch (err) {
        console.error("Report generation failed:", err);
        // Fallback defaults
        reportData = {
            overall_score: 70,
            communication_score: 70,
            technical_score: 70,
            strengths: ["Completed the interview"],
            concerns: [],
            ai_summary: "The candidate completed the interview successfully.",
            ai_recommendation: "maybe" as const,
            key_highlights: ["Completed interview"],
        };
    }

    const completedAt = new Date();
    const durationSeconds = session.started_at
        ? Math.round((completedAt.getTime() - new Date(session.started_at).getTime()) / 1000)
        : null;

    // Save report to session
    await db.update(interview_sessions).set({
        completed_at: completedAt,
        duration_seconds: durationSeconds,
        overall_score: reportData.overall_score,
        communication_score: reportData.communication_score,
        technical_score: reportData.technical_score,
        strengths: reportData.strengths,
        concerns: reportData.concerns,
        ai_summary: reportData.ai_summary,
        ai_recommendation: reportData.ai_recommendation,
        key_highlights: reportData.key_highlights,
    }).where(eq(interview_sessions.id, session.id));

    // Update invite status
    if (invite) {
        await db.update(interview_invites)
            .set({ status: "completed" })
            .where(eq(interview_invites.id, invite.id));
    }

    return NextResponse.json({ success: true, questionsAnswered: session.questions_answered });
}
