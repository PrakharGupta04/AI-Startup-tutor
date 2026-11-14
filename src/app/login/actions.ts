"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { parseInput, loginSchema } from "@/lib/validation";
import { authenticate } from "@/lib/data/users";
import { setSessionCookie } from "@/lib/auth";
import { toFailure, type ActionResult } from "@/lib/errors";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult | null> {
  let shouldRedirect = false;

  try {
    const raw = Object.fromEntries(formData);
    const input = parseInput(loginSchema, raw);
    const user = await authenticate(getDb(), input);
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
