import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
    const refreshToken = req.cookies.get("refresh_token")?.value;
    if (!refreshToken) {
        return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
        return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const newAccessToken = signAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
    });

    const response = NextResponse.json({ message: "Token refreshed" });
    response.cookies.set("access_token", newAccessToken, {
        httpOnly: true, secure: process.env.NODE_ENV === "production",
        sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
    });

    return response;
}
