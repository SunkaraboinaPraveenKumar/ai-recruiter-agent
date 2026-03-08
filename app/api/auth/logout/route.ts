import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
}
