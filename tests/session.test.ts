import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("session tokens and password hashing", () => {
  const secret = "test-session-secret-key-at-least-32-chars-long";
  const userId = 42;

  it("roundtrips a valid session token and returns the user id", async () => {
    const token = await createSessionToken(userId, secret);
    const verifiedId = await verifySessionToken(token, secret);
    expect(verifiedId).toBe(userId);
  });

  it("returns null for a tampered token", async () => {
    const token = await createSessionToken(userId, secret);
    const tampered = token.slice(0, -4) + "abcd";
    const result = await verifySessionToken(tampered, secret);
    expect(result).toBeNull();
  });

  it("returns null when verified with the wrong secret", async () => {
    const token = await createSessionToken(userId, secret);
    const result = await verifySessionToken(
      token,
      "wrong-secret-key-that-is-different-32-chars"
    );
    expect(result).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const expiredToken = await createSessionToken(userId, secret, -10);
    const result = await verifySessionToken(expiredToken, secret);
    expect(result).toBeNull();
  });

  it("returns null for a garbage string", async () => {
    const result = await verifySessionToken("not-a-token-at-all", secret);
    expect(result).toBeNull();
  });

  it("hashes password such that hash differs from plaintext and starts with $2", async () => {
    const plain = "mySecretPassword123";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies password returns true for correct and false for wrong", async () => {
    const plain = "mySecretPassword123";
    const hash = await hashPassword(plain);

    expect(await verifyPassword(plain, hash)).toBe(true);
    expect(await verifyPassword("wrongPassword123", hash)).toBe(false);
  });
});
