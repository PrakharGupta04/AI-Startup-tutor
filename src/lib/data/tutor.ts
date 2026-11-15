import { eq, desc, asc, sql, count } from "drizzle-orm";
import type { Db } from "../db/client";
import { interactions, interactionNotes, users } from "../db/schema";
import { AppError } from "../errors";
import { assertInstructor, type AuthUser } from "../permissions";
import type { AiProvider } from "../ai/types";
import { AI_INPUT_LIMITS } from "../ai/types";
import { isAiError } from "../ai/errors";
import type { z } from "zod";
import type {
  askSchema,
  interactionIdSchema,
  interactionListSchema,
  noteAddSchema,
  noteUpdateSchema,
  noteIdSchema,
} from "../validation";

export const TUTOR_PAGE_SIZE = 20;
export const PENDING_STALE_MS = 120_000;

export type InteractionView = {
  id: number;
  authorId: number;
  authorName: string;
  prompt: string;
  response: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  model: string | null;
  createdAt: Date;
  completedAt: Date | null;
  noteCount: number;
};

export type NoteView = {
  id: number;
  interactionId: number;
  authorId: number;
  authorName: string;
  authorRole: "MEMBER" | "INSTRUCTOR";
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InteractionDetail = InteractionView & {
  notes: NoteView[];
};

export function computeEffectiveStatus(interaction: {
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: Date;
  errorMessage: string | null;
}): { status: "PENDING" | "COMPLETED" | "FAILED"; errorMessage: string | null } {
  if (
    interaction.status === "PENDING" &&
    Date.now() - interaction.createdAt.getTime() > PENDING_STALE_MS
  ) {
    return {
      status: "FAILED",
      errorMessage: "The request did not finish. Please retry.",
    };
  }
  return {
    status: interaction.status,
    errorMessage: interaction.errorMessage,
  };
}

export async function askTutor(
  db: Db,
  actor: AuthUser,
  ai: AiProvider,
  input: z.infer<typeof askSchema>
): Promise<{
  id: number;
  status: "COMPLETED" | "FAILED";
  errorMessage: string | null;
}> {
  const trimmed = input.prompt.trim();
  if (!trimmed) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      prompt: "Enter a question.",
    });
  }
  if (trimmed.length > AI_INPUT_LIMITS.tutorPrompt) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      prompt: `The question is too long (max ${AI_INPUT_LIMITS.tutorPrompt} characters).`,
    });
  }

  // Insert PENDING row and commit before calling AI
  const [inserted] = await db
    .insert(interactions)
    .values({
      authorId: actor.id,
      prompt: trimmed,
      status: "PENDING",
    })
    .returning({ id: interactions.id });

  try {
    const response = await ai.tutorAnswer({ prompt: trimmed });
    await db
      .update(interactions)
      .set({
        status: "COMPLETED",
        response,
        model: ai.model,
        completedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(interactions.id, inserted.id));

    return { id: inserted.id, status: "COMPLETED", errorMessage: null };
  } catch (err) {
    if (isAiError(err)) {
      await db
        .update(interactions)
        .set({
          status: "FAILED",
          errorMessage: err.message,
          response: null,
        })
        .where(eq(interactions.id, inserted.id));

      return { id: inserted.id, status: "FAILED", errorMessage: err.message };
    }

    await db
      .update(interactions)
      .set({
        status: "FAILED",
        errorMessage: "Something went wrong. Please try again.",
        response: null,
      })
      .where(eq(interactions.id, inserted.id));

    throw err;
  }
}

export async function retryInteraction(
  db: Db,
  actor: AuthUser,
  ai: AiProvider,
  input: z.infer<typeof interactionIdSchema>
): Promise<{
  id: number;
  status: "COMPLETED" | "FAILED";
  errorMessage: string | null;
}> {
  const [existing] = await db
    .select()
    .from(interactions)
    .where(eq(interactions.id, input.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Interaction not found.");
  }

  if (existing.authorId !== actor.id) {
    throw new AppError(
      "FORBIDDEN",
      "You can only retry your own questions."
    );
  }

  const effective = computeEffectiveStatus(existing);
  if (effective.status !== "FAILED") {
    throw new AppError("CONFLICT", "This question does not need a retry.");
  }

  await db
    .update(interactions)
    .set({
      status: "PENDING",
      errorMessage: null,
      completedAt: null,
      response: null,
    })
    .where(eq(interactions.id, existing.id));

  try {
    const response = await ai.tutorAnswer({ prompt: existing.prompt });
    await db
      .update(interactions)
      .set({
        status: "COMPLETED",
        response,
        model: ai.model,
        completedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(interactions.id, existing.id));

    return { id: existing.id, status: "COMPLETED", errorMessage: null };
  } catch (err) {
    if (isAiError(err)) {
      await db
        .update(interactions)
        .set({
          status: "FAILED",
          errorMessage: err.message,
          response: null,
        })
        .where(eq(interactions.id, existing.id));

      return { id: existing.id, status: "FAILED", errorMessage: err.message };
    }

    await db
      .update(interactions)
      .set({
        status: "FAILED",
        errorMessage: "Something went wrong. Please try again.",
        response: null,
      })
      .where(eq(interactions.id, existing.id));

    throw err;
  }
}

export async function listInteractions(
  db: Db,
  _actor: AuthUser,
  input: z.infer<typeof interactionListSchema>
): Promise<{ items: InteractionView[]; total: number; pageSize: number }> {
  const pageSize = TUTOR_PAGE_SIZE;
  const page = input.page && input.page >= 1 ? input.page : 1;
  const offset = (page - 1) * pageSize;

  const [totalResult] = await db
    .select({ total: count() })
    .from(interactions);
  const total = totalResult ? totalResult.total : 0;

  const noteCountSql = sql<number>`(select count(*) from ${interactionNotes} where ${interactionNotes.interactionId} = ${interactions.id})`.mapWith(
    Number
  );

  const rows = await db
    .select({
      id: interactions.id,
      authorId: interactions.authorId,
      authorName: users.name,
      prompt: interactions.prompt,
      response: interactions.response,
      status: interactions.status,
      errorMessage: interactions.errorMessage,
      model: interactions.model,
      createdAt: interactions.createdAt,
      completedAt: interactions.completedAt,
      noteCount: noteCountSql,
    })
    .from(interactions)
    .innerJoin(users, eq(interactions.authorId, users.id))
    .orderBy(desc(interactions.createdAt), desc(interactions.id))
    .limit(pageSize)
    .offset(offset);

  const items: InteractionView[] = rows.map((row) => {
    const effective = computeEffectiveStatus(row);
    return {
      ...row,
      status: effective.status,
      errorMessage: effective.errorMessage,
    };
  });

  return {
    items,
    total,
    pageSize,
  };
}

export async function getInteraction(
  db: Db,
  _actor: AuthUser,
  id: number
): Promise<InteractionDetail> {
  const rows = await db
    .select({
      id: interactions.id,
      authorId: interactions.authorId,
      authorName: users.name,
      prompt: interactions.prompt,
      response: interactions.response,
      status: interactions.status,
      errorMessage: interactions.errorMessage,
      model: interactions.model,
      createdAt: interactions.createdAt,
      completedAt: interactions.completedAt,
    })
    .from(interactions)
    .innerJoin(users, eq(interactions.authorId, users.id))
    .where(eq(interactions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new AppError("NOT_FOUND", "Interaction not found.");
  }

  const rawNotes = await db
    .select({
      id: interactionNotes.id,
      interactionId: interactionNotes.interactionId,
      authorId: interactionNotes.authorId,
      authorName: users.name,
      authorRole: users.role,
      body: interactionNotes.body,
      createdAt: interactionNotes.createdAt,
      updatedAt: interactionNotes.updatedAt,
    })
    .from(interactionNotes)
    .innerJoin(users, eq(interactionNotes.authorId, users.id))
    .where(eq(interactionNotes.interactionId, id))
    .orderBy(asc(interactionNotes.createdAt), asc(interactionNotes.id));

  const effective = computeEffectiveStatus(row);

  return {
    ...row,
    status: effective.status,
    errorMessage: effective.errorMessage,
    noteCount: rawNotes.length,
    notes: rawNotes,
  };
}

export async function deleteInteraction(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof interactionIdSchema>
): Promise<void> {
  assertInstructor(actor);

  const [existing] = await db
    .select()
    .from(interactions)
    .where(eq(interactions.id, input.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Interaction not found.");
  }

  await db.delete(interactions).where(eq(interactions.id, input.id));
}

export async function addNote(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof noteAddSchema>
): Promise<{ id: number }> {
  const [existing] = await db
    .select({ id: interactions.id })
    .from(interactions)
    .where(eq(interactions.id, input.interactionId))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Interaction not found.");
  }

  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      body: "Write a note.",
    });
  }
  if (trimmed.length > 2000) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      body: "Note must be at most 2000 characters.",
    });
  }

  const [inserted] = await db
    .insert(interactionNotes)
    .values({
      interactionId: input.interactionId,
      authorId: actor.id,
      body: trimmed,
    })
    .returning({ id: interactionNotes.id });

  return { id: inserted.id };
}

export async function updateNote(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof noteUpdateSchema>
): Promise<void> {
  const [existing] = await db
    .select()
    .from(interactionNotes)
    .where(eq(interactionNotes.id, input.noteId))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Note not found.");
  }

  if (existing.authorId !== actor.id) {
    throw new AppError("FORBIDDEN", "You can only edit your own notes.");
  }

  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      body: "Write a note.",
    });
  }
  if (trimmed.length > 2000) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      body: "Note must be at most 2000 characters.",
    });
  }

  await db
    .update(interactionNotes)
    .set({
      body: trimmed,
      updatedAt: new Date(),
    })
    .where(eq(interactionNotes.id, input.noteId));
}

export async function deleteNote(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof noteIdSchema>
): Promise<void> {
  const [existing] = await db
    .select()
    .from(interactionNotes)
    .where(eq(interactionNotes.id, input.noteId))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Note not found.");
  }

  const isAuthor = existing.authorId === actor.id;
  const isInstructorRole = actor.role === "INSTRUCTOR";

  if (!isAuthor && !isInstructorRole) {
    throw new AppError("FORBIDDEN", "You cannot delete this note.");
  }

  await db
    .delete(interactionNotes)
    .where(eq(interactionNotes.id, input.noteId));
}
