import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

export function getAuthUser(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;
    return verifyAccessToken(token);
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function requireAuth(req: NextRequest) {
    const user = getAuthUser(req);
    if (!user) return { user: null, response: unauthorizedResponse() };
    return { user, response: null };
}
