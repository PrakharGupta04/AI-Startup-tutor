"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getActionUser } from "@/lib/auth";
import {
  parseInput,
  updateProfileSchema,
  changePasswordSchema,
  addMemberSchema,
  resetPasswordSchema,
  setActiveSchema,
  setRoleSchema,
} from "@/lib/validation";
import {
  updateProfile,
  changePassword,
  addMember,
  resetPassword,
  setUserActive,
  setUserRole,
} from "@/lib/data/users";
import { AppError, toFailure, success, type ActionResult } from "@/lib/errors";

export interface SettingsResult {
  message: string;
}

export async function updateProfileAction(
  _prev: ActionResult<SettingsResult> | null,
  formData: FormData
): Promise<ActionResult<SettingsResult>> {
  try {
    const actor = await getActionUser();
    const raw = Object.fromEntries(formData);
    const input = parseInput(updateProfileSchema, raw);

    await updateProfile(getDb(), actor, input);
    revalidatePath("/", "layout");

    return success({ message: "Profile updated successfully." });
  } catch (error) {
    return toFailure(error);
  }
}

export async function changePasswordAction(
  _prev: ActionResult<SettingsResult> | null,
  formData: FormData
): Promise<ActionResult<SettingsResult>> {
  try {
    const actor = await getActionUser();
    const raw = Object.fromEntries(formData);

    const newPassword =
      typeof raw.newPassword === "string" ? raw.newPassword : "";
    const confirmPassword =
      typeof raw.confirmPassword === "string" ? raw.confirmPassword : "";

    if (newPassword !== confirmPassword) {
      throw new AppError(
        "VALIDATION",
        "Please correct the highlighted fields.",
        {
          confirmPassword: "Passwords do not match.",
        }
      );
    }

    const input = parseInput(changePasswordSchema, raw);
    await changePassword(getDb(), actor, input);

    return success({ message: "Password changed successfully." });
  } catch (error) {
    return toFailure(error);
  }
}

export async function addMemberAction(
  _prev: ActionResult<SettingsResult> | null,
  formData: FormData
): Promise<ActionResult<SettingsResult>> {
  try {
    const actor = await getActionUser();
    const raw = Object.fromEntries(formData);
    const input = parseInput(addMemberSchema, raw);

    await addMember(getDb(), actor, input);
    revalidatePath("/settings/members");

    return success({
      message: `Member "${input.name}" was added successfully.`,
    });
  } catch (error) {
    return toFailure(error);
  }
}

export async function resetPasswordAction(
  _prev: ActionResult<SettingsResult> | null,
  formData: FormData
): Promise<ActionResult<SettingsResult>> {
  try {
    const actor = await getActionUser();
    const raw = Object.fromEntries(formData);
    const input = parseInput(resetPasswordSchema, raw);

    await resetPassword(getDb(), actor, input);
    revalidatePath("/settings/members");

    return success({ message: "Password was reset successfully." });
  } catch (error) {
    return toFailure(error);
  }
}

export async function setActiveAction(
  _prev: ActionResult<SettingsResult> | null,
  formData: FormData
): Promise<ActionResult<SettingsResult>> {
  try {
    const actor = await getActionUser();
    const raw = Object.fromEntries(formData);
    const input = parseInput(setActiveSchema, raw);

    await setUserActive(getDb(), actor, input);
    revalidatePath("/settings/members");

    return success({
      message: `Member status was updated to ${input.isActive ? "active" : "inactive"}.`,
    });
  } catch (error) {
    return toFailure(error);
  }
}

export async function setRoleAction(
  _prev: ActionResult<SettingsResult> | null,
  formData: FormData
): Promise<ActionResult<SettingsResult>> {
  try {
    const actor = await getActionUser();
    const raw = Object.fromEntries(formData);
    const input = parseInput(setRoleSchema, raw);

    await setUserRole(getDb(), actor, input);
    revalidatePath("/settings/members");

    return success({
      message: `Member role was updated to ${input.role}.`,
    });
  } catch (error) {
    return toFailure(error);
  }
}
