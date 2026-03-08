import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { comparePassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password required" }, { status: 400 });
        }

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        if (!user.password_hash) {
            return NextResponse.json({ error: "Please sign in with Google" }, { status: 401 });
        }

        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const payload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        const response = NextResponse.json({
            user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url },
        });

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
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
