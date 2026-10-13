import crypto from "crypto";
import { cookies } from "next/headers";

// Az OAuth `state` paraméter két dolgot visz: azt, hogy melyik ügyfélhez tartozik a
// kapcsolat (partnerClientId), és egy egyszer használatos, véletlen értéket (nonce),
// amely a CSRF-támadás ellen véd (RFC 9700). A nonce másolata egy httpOnly sütiben
// marad a böngészőben, így a callback össze tudja vetni a kettőt.
//
// Formátum: "<ügyfél UUID>.<nonce>"

const STATE_TTL_SECONDS = 600;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OAuthPlatform = "youtube" | "meta" | "tiktok";

function cookieName(platform: OAuthPlatform): string {
    return `oauth_state_${platform}`;
}

export function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}

// Az indító route hívja: létrehozza a nonce-t, elmenti a sütibe, és visszaadja
// a `state` értéket, amit a platform felé továbbítunk.
export async function issueOAuthState(platform: OAuthPlatform, partnerClientId: string): Promise<string> {
    if (!isUuid(partnerClientId)) {
        throw new Error("partnerClientId is not a valid UUID");
    }

    const nonce = crypto.randomBytes(32).toString("base64url");

    const cookieStore = await cookies();
    cookieStore.set(cookieName(platform), nonce, {
        httpOnly: true,
        secure: true,
        sameSite: "lax", // a platformról visszairányító, felső szintű GET kérésnél a süti még elmegy
        maxAge: STATE_TTL_SECONDS,
        path: "/",
    });

    return `${partnerClientId}.${nonce}`;
}

// A callback route hívja: ellenőrzi, hogy a visszakapott `state` nonce-a megegyezik-e
// a sütiben tárolttal. Siker esetén visszaadja az ügyfél azonosítóját, különben null-t.
// A nonce egyszer használatos: az ellenőrzés után (sikertől függetlenül) töröljük.
export async function verifyOAuthState(platform: OAuthPlatform, state: string): Promise<string | null> {
    const cookieStore = await cookies();
    const expectedNonce = cookieStore.get(cookieName(platform))?.value;
    cookieStore.delete(cookieName(platform));

    if (!expectedNonce) return null;

    const parts = state.split(".");
    if (parts.length !== 2) return null;

    const [partnerClientId, receivedNonce] = parts;
    if (!isUuid(partnerClientId)) return null;

    // Mindkét értéket SHA-256-tal azonos hosszúra hozzuk, hogy a timingSafeEqual
    // hosszeltérés miatt ne dobjon hibát, és az összehasonlítás ideje ne függjön az egyezéstől.
    const expectedHash = crypto.createHash("sha256").update(expectedNonce).digest();
    const receivedHash = crypto.createHash("sha256").update(receivedNonce).digest();
    if (!crypto.timingSafeEqual(expectedHash, receivedHash)) return null;

    return partnerClientId;
}
