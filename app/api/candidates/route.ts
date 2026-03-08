import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, or, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let query = db.select().from(candidates)
        .where(eq(candidates.recruiter_id, user!.userId))
        .$dynamic();

    if (search) {
        query = query.where(
            or(
                ilike(candidates.full_name, `%${search}%`),
                ilike(candidates.email, `%${search}%`),
                ilike(candidates.current_role, `%${search}%`),
            )
        );
    }

    const list = await query;
    return NextResponse.json({ candidates: list });
}

export async function POST(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    try {
        const body = await req.json();
        const { full_name, email, phone, location, current_role, years_experience, skills, resume_url, resume_text, linkedin_url, notes } = body;

        if (!full_name || !email) {
            return NextResponse.json({ error: "Name and email required" }, { status: 400 });
        }

        const [candidate] = await db.insert(candidates).values({
            recruiter_id: user!.userId,
            full_name, email, phone: phone || null, location: location || null,
            current_role: current_role || null,
            years_experience: years_experience ? Number(years_experience) : null,
            skills: skills || null,
            resume_url: resume_url || null,
            resume_text: resume_text || null,
            linkedin_url: linkedin_url || null,
            notes: notes || null,
        }).returning();

        return NextResponse.json({ candidate }, { status: 201 });
    } catch (error) {
        console.error("Create candidate error:", error);
        return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
    }
}
