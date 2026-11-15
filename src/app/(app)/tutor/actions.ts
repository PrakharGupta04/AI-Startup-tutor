"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getActionUser } from "@/lib/auth";
import { getAiProvider } from "@/lib/ai";
import {
  parseInput,
  askSchema,
  interactionIdSchema,
  noteAddSchema,
  noteUpdateSchema,
  noteIdSchema,
} from "@/lib/validation";
import {
  askTutor,
  retryInteraction,
  deleteInteraction,
  addNote,
  updateNote,
  deleteNote,
} from "@/lib/data/tutor";
import { toFailure, success, type ActionResult } from "@/lib/errors";

export interface TutorActionResult {
  id: number;
  status: "COMPLETED" | "FAILED";
  errorMessage: string | null;
}

export async function askAction(
  input: unknown
): Promise<ActionResult<TutorActionResult>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(askSchema, input);
    const ai = getAiProvider();
    const result = await askTutor(getDb(), actor, ai, validated);
    revalidatePath("/tutor", "layout");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function retryAction(
  input: unknown
): Promise<ActionResult<TutorActionResult>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(interactionIdSchema, input);
    const ai = getAiProvider();
    const result = await retryInteraction(getDb(), actor, ai, validated);
    revalidatePath("/tutor", "layout");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteInteractionAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(interactionIdSchema, input);
    await deleteInteraction(getDb(), actor, validated);
    revalidatePath("/tutor", "layout");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}

export async function addNoteAction(
  input: unknown
): Promise<ActionResult<{ id: number }>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(noteAddSchema, input);
    const result = await addNote(getDb(), actor, validated);
    revalidatePath("/tutor", "layout");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateNoteAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(noteUpdateSchema, input);
    await updateNote(getDb(), actor, validated);
    revalidatePath("/tutor", "layout");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteNoteAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(noteIdSchema, input);
    await deleteNote(getDb(), actor, validated);
    revalidatePath("/tutor", "layout");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}
