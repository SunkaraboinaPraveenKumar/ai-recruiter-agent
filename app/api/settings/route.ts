import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { app_settings } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const [settings] = await db.select().from(app_settings)
        .where(eq(app_settings.recruiter_id, user!.userId));

    return NextResponse.json({ settings: settings || null });
}

export async function PATCH(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const body = await req.json();
    const recruiterId = user!.userId;

    const existing = await db.select().from(app_settings)
        .where(eq(app_settings.recruiter_id, recruiterId));

    let settings;
    if (existing.length === 0) {
        [settings] = await db.insert(app_settings)
            .values({ recruiter_id: recruiterId, ...body })
            .returning();
    } else {
        [settings] = await db.update(app_settings)
            .set({ ...body, updated_at: new Date() })
            .where(eq(app_settings.recruiter_id, recruiterId))
            .returning();
    }

    return NextResponse.json({ settings });
}
