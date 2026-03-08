import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect /dashboard/* routes
    if (pathname.startsWith("/dashboard")) {
        const token = request.cookies.get("access_token")?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/sign-in", request.url));
        }

        try {
            const { payload } = await jwtVerify(token, ACCESS_SECRET);
            const userId = payload.userId as string;
            const email = payload.email as string;
            const role = payload.role as string;

            // Add user info to request headers for downstream API routes
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set("x-user-id", userId);
            requestHeaders.set("x-user-email", email);
            requestHeaders.set("x-user-role", role);

            return NextResponse.next({
                request: { headers: requestHeaders },
            });
        } catch {
            const response = NextResponse.redirect(new URL("/sign-in", request.url));
            response.cookies.delete("access_token");
            response.cookies.delete("refresh_token");
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
