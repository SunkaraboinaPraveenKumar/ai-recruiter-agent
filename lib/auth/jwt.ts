import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export function signAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "7d" });
}

export function signRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, ACCESS_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, REFRESH_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}
