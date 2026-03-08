import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, response } = requireAuth(req);
    if (response) return response;
    const { id } = await params;

    const [candidate] = await db.select().from(candidates)
        .where(and(eq(candidates.id, id), eq(candidates.recruiter_id, user!.userId)));
    if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ candidate });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, response } = requireAuth(req);
    if (response) return response;
    const { id } = await params;

    const body = await req.json();
    const [candidate] = await db.update(candidates)
        .set({ ...body, updated_at: new Date() })
        .where(and(eq(candidates.id, id), eq(candidates.recruiter_id, user!.userId)))
        .returning();

    if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ candidate });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, response } = requireAuth(req);
    if (response) return response;
    const { id } = await params;

    const [deleted] = await db.delete(candidates)
        .where(and(eq(candidates.id, id), eq(candidates.recruiter_id, user!.userId)))
        .returning();

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted" });
}
