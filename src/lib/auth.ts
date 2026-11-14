import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getEnv } from "./env";
import { getDb } from "./db/client";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "./session";
import { getActiveUserById } from "./data/users";
import { isInstructor, type AuthUser } from "./permissions";
import { AppError } from "./errors";

export const SESSION_COOKIE = "cst_session";

export async function setSessionCookie(userId: number): Promise<void> {
  const cookieStore = await cookies();
  const token = await createSessionToken(userId, getEnv().AUTH_SECRET);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const userId = await verifySessionToken(token, getEnv().AUTH_SECRET);
  if (!userId) {
    return null;
  }

  return getActiveUserById(getDb(), userId);
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireInstructor(): Promise<AuthUser> {
  const user = await requireUser();
  if (!isInstructor(user)) {
    notFound();
  }
  return user;
}

export async function getActionUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Please log in again.");
  }
  return user;
}
