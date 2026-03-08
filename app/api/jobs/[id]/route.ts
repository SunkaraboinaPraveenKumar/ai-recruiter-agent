import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, response } = requireAuth(req);
    if (response) return response;
    const { id } = await params;

    try {
        const body = await req.json();
        const [job] = await db.update(jobs)
            .set({ ...body, updated_at: new Date() })
            .where(and(eq(jobs.id, id), eq(jobs.recruiter_id, user!.userId)))
            .returning();

        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        return NextResponse.json({ job });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, response } = requireAuth(req);
    if (response) return response;
    const { id } = await params;

    const [deleted] = await db.delete(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.recruiter_id, user!.userId)))
        .returning();

    if (!deleted) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted" });
}
