"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getActionUser } from "@/lib/auth";
import { getAiProvider } from "@/lib/ai";
import {
  parseInput,
  newsSaveSchema,
  newsIdSchema,
} from "@/lib/validation";
import {
  saveNews,
  generateNewsSummary,
  publishNews,
  unpublishNews,
  deleteNews,
} from "@/lib/data/news";
import { toFailure, success, type ActionResult } from "@/lib/errors";

export async function saveNewsAction(
  input: unknown
): Promise<ActionResult<{ id: number }>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(newsSaveSchema, input);
    const result = await saveNews(getDb(), actor, validated);
    revalidatePath("/news", "layout");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function generateNewsAction(
  input: unknown
): Promise<ActionResult<{ factSummary: string; whyItMatters: string }>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(newsIdSchema, input);
    const ai = getAiProvider();
    const result = await generateNewsSummary(getDb(), actor, ai, validated);
    revalidatePath("/news", "layout");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function publishNewsAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(newsIdSchema, input);
    await publishNews(getDb(), actor, validated);
    revalidatePath("/news", "layout");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}

export async function unpublishNewsAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(newsIdSchema, input);
    await unpublishNews(getDb(), actor, validated);
    revalidatePath("/news", "layout");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteNewsAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const actor = await getActionUser();
    const validated = parseInput(newsIdSchema, input);
    await deleteNews(getDb(), actor, validated);
    revalidatePath("/news", "layout");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}
