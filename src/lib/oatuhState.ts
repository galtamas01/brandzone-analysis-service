import crypto from "crypto";
import { cookies } from "next/headers";

const STATE_TTL_SECONDS = 600;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type OAuthPlatform = "youtube" | "meta" | "tiktok";

function cookieName(platform: OAuthPlatform): string {
    return `oauth_state_${platform}`;
}

export function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}

export async function issueOAuthState(platform: OAuthPlatform, partnerClientId: string): Promise<string> {
    if (!isUuid(partnerClientId)) {
        throw new Error("partnerClientId is not a valid UUID");
    }

    const nonce = crypto.randomBytes(32).toString("base64url");
    const cookieStore = await cookies();
    cookieStore.set(cookieName(platform), nonce, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: STATE_TTL_SECONDS,
        path: "/",
    });

    return `${partnerClientId}.${nonce}`;
}

export async function verifyOAuthState(platform: OAuthPlatform, state: string): Promise<string | null> {
    const cookieStore = await cookies();
    const expectedNonce = cookieStore.get(cookieName(platform))?.value;
    cookieStore.delete(cookieName(platform));

    if (!expectedNonce) return null;

    const parts = state.split(".");
    if (parts.length !== 2) return null;

    const [partnerClientId, receivedNonce] = parts;
    if (!isUuid(partnerClientId)) return null;

    const expectedHash = crypto.createHash("sha256").update(expectedNonce).digest();
    const receivedHash = crypto.createHash("sha256").update(receivedNonce).digest();
    if (!crypto.timingSafeEqual(expectedHash, receivedHash)) return null;

    return partnerClientId;
}