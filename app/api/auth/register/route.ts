import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { full_name, email, password } = await req.json();

        if (!full_name || !email || !password) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        // Check if user already exists
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing.length > 0) {
            return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }

        const password_hash = await hashPassword(password);
        const [user] = await db
            .insert(users)
            .values({ full_name, email, password_hash, role: "recruiter" })
            .returning();

        const payload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        const response = NextResponse.json(
            { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } },
            { status: 201 }
        );

        response.cookies.set("access_token", accessToken, {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
        });
        response.cookies.set("refresh_token", refreshToken, {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
        });

        return response;
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
