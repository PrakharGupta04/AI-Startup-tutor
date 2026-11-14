import { SignJWT, jwtVerify } from "jose";

export const SESSION_MAX_AGE_SECONDS = 604800; // 7 days

export async function createSessionToken(
  userId: number,
  secret: string,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<number | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}
