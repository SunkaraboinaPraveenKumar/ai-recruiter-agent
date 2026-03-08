import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_sessions, interview_invites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET session data for schedules results panel
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    // token here is actually invite_id from schedules page
    const [session] = await db.select().from(interview_sessions)
        .where(eq(interview_sessions.invite_id, token))
        .orderBy(interview_sessions.created_at);

    if (!session) {
        return NextResponse.json({ session: null });
    }

    return NextResponse.json({ session });
}
