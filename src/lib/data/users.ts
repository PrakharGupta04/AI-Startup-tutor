import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, asc } from "drizzle-orm";
import type { Db } from "../db/client";
import { users } from "../db/schema";
import { AppError } from "../errors";
import { assertInstructor, type AuthUser } from "../permissions";
import { hashPassword, verifyPassword } from "../password";

export type MemberRow = AuthUser & {
  isActive: boolean;
  createdAt: Date;
};

const DUMMY_HASH = bcrypt.hashSync("cst-dummy-timing-mitigation-password", 10);

function safeCodeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function registerUser(
  db: Db,
  input: { name: string; email: string; password: string; code: string },
  codes: { joinCode: string; instructorCode: string }
): Promise<AuthUser> {
  const trimmedCode = input.code.trim();
  let role: "MEMBER" | "INSTRUCTOR";

  if (safeCodeCompare(trimmedCode, codes.instructorCode)) {
    role = "INSTRUCTOR";
  } else if (safeCodeCompare(trimmedCode, codes.joinCode)) {
    role = "MEMBER";
  } else {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      code: "Invalid registration code",
    });
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name.trim();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("CONFLICT", "Please correct the highlighted fields.", {
      email: "An account with this email already exists",
    });
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [created] = await db
      .insert(users)
      .values({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    return created;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE") || message.includes("unique")) {
      throw new AppError("CONFLICT", "Please correct the highlighted fields.", {
        email: "An account with this email already exists",
      });
    }
    throw err;
  }
}

export async function authenticate(
  db: Db,
  input: { email: string; password: string }
): Promise<AuthUser> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const user = rows[0];
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const passwordValid = await verifyPassword(input.password, hashToCompare);

  if (!user || !passwordValid) {
    throw new AppError("UNAUTHENTICATED", "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(
      "FORBIDDEN",
      "This account has been deactivated. Please contact your instructor."
    );
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getActiveUserById(
  db: Db,
  id: number
): Promise<AuthUser | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = rows[0];
  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function listMembers(
  db: Db,
  actor: AuthUser
): Promise<MemberRow[]> {
  assertInstructor(actor);

  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}

export async function addMember(
  db: Db,
  actor: AuthUser,
  input: { name: string; email: string; password: string }
): Promise<MemberRow> {
  assertInstructor(actor);

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name.trim();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("CONFLICT", "Please correct the highlighted fields.", {
      email: "An account with this email already exists",
    });
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [created] = await db
      .insert(users)
      .values({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: "MEMBER",
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return created;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE") || message.includes("unique")) {
      throw new AppError("CONFLICT", "Please correct the highlighted fields.", {
        email: "An account with this email already exists",
      });
    }
    throw err;
  }
}

export async function resetPassword(
  db: Db,
  actor: AuthUser,
  input: { userId: number; newPassword: string }
): Promise<void> {
  assertInstructor(actor);

  if (actor.id === input.userId) {
    throw new AppError(
      "FORBIDDEN",
      "Use Settings to change your own password."
    );
  }

  const target = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (target.length === 0) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, input.userId));
}

export async function setUserActive(
  db: Db,
  actor: AuthUser,
  input: { userId: number; isActive: boolean }
): Promise<void> {
  assertInstructor(actor);

  if (actor.id === input.userId) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot change your own role or status."
    );
  }

  const target = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (target.length === 0) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  await db
    .update(users)
    .set({ isActive: input.isActive })
    .where(eq(users.id, input.userId));
}

export async function setUserRole(
  db: Db,
  actor: AuthUser,
  input: { userId: number; role: "MEMBER" | "INSTRUCTOR" }
): Promise<void> {
  assertInstructor(actor);

  if (actor.id === input.userId) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot change your own role or status."
    );
  }

  const target = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (target.length === 0) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  await db
    .update(users)
    .set({ role: input.role })
    .where(eq(users.id, input.userId));
}

export async function updateProfile(
  db: Db,
  actor: AuthUser,
  input: { name: string }
): Promise<AuthUser> {
  const normalizedName = input.name.trim();

  const [updated] = await db
    .update(users)
    .set({ name: normalizedName })
    .where(eq(users.id, actor.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  if (!updated) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  return updated;
}

export async function changePassword(
  db: Db,
  actor: AuthUser,
  input: { currentPassword: string; newPassword: string }
): Promise<void> {
  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);

  const current = rows[0];
  if (!current) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  const isValid = await verifyPassword(
    input.currentPassword,
    current.passwordHash
  );

  if (!isValid) {
    throw new AppError(
      "VALIDATION",
      "Please correct the highlighted fields.",
      { currentPassword: "Current password is incorrect" }
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, actor.id));
}
