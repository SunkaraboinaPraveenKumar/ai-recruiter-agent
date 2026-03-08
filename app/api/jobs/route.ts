import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const jobList = await db.select().from(jobs)
        .where(eq(jobs.recruiter_id, user!.userId))
        .orderBy(jobs.created_at);

    return NextResponse.json({ jobs: jobList });
}

export async function POST(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    try {
        const body = await req.json();
        const { title, type, location, salary_min, salary_max, description, responsibilities, requirements, status } = body;

        if (!title || !type || !location || !description) {
            return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
        }

        const [job] = await db.insert(jobs).values({
            recruiter_id: user!.userId,
            title, type, location,
            salary_min: salary_min || null,
            salary_max: salary_max || null,
            description,
            responsibilities: responsibilities || null,
            requirements: requirements || null,
            status: status || "draft",
        }).returning();

        return NextResponse.json({ job }, { status: 201 });
    } catch (error) {
        console.error("Create job error:", error);
        return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }
}
