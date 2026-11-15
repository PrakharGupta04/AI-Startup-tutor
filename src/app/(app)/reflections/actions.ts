"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getActionUser } from "@/lib/auth";
import { getAiProvider } from "@/lib/ai";
import {
  parseInput,
  reflectionSaveSchema,
  reflectionIdSchema,
} from "@/lib/validation";
import {
  saveReflection,
  structureWithAi,
  clearStructured,
  submitReflection,
  deleteReflection,
} from "@/lib/data/reflections";
import { toFailure, success, type ActionResult } from "@/lib/errors";
import type { StructuredReflection } from "@/lib/ai/types";

export async function saveDraftAction(
  input: unknown
): Promise<ActionResult<{ id: number }>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(reflectionSaveSchema, input);
    const result = await saveReflection(getDb(), actor, validated);
    revalidatePath("/reflections");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function structureAction(
  input: unknown
): Promise<ActionResult<StructuredReflection>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(reflectionIdSchema, input);
    const ai = getAiProvider();
    const result = await structureWithAi(getDb(), actor, ai, validated);
    revalidatePath("/reflections");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function clearStructuredAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(reflectionIdSchema, input);
    await clearStructured(getDb(), actor, validated);
    revalidatePath("/reflections");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}

export async function submitReflectionAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(reflectionIdSchema, input);
    await submitReflection(getDb(), actor, validated);
    revalidatePath("/reflections");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteReflectionAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(reflectionIdSchema, input);
    await deleteReflection(getDb(), actor, validated);
    revalidatePath("/reflections");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}
