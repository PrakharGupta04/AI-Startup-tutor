"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { parseInput, registerSchema } from "@/lib/validation";
import { registerUser } from "@/lib/data/users";
import { setSessionCookie } from "@/lib/auth";
import { toFailure, type ActionResult } from "@/lib/errors";

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult | null> {
  let shouldRedirect = false;

  try {
    const raw = Object.fromEntries(formData);
    const input = parseInput(registerSchema, raw);
    const user = await registerUser(getDb(), input, {
      joinCode: getEnv().GROUP_JOIN_CODE,
      instructorCode: getEnv().INSTRUCTOR_CODE,
    });
    await setSessionCookie(user.id);
    shouldRedirect = true;
  } catch (error) {
    return toFailure(error);
  }

  if (shouldRedirect) {
    redirect("/dashboard");
  }

  return null;
}
