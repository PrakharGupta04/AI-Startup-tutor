import { eq, and, or, desc, sql, count } from "drizzle-orm";
import type { Db } from "../db/client";
import { reflections, users } from "../db/schema";
import { AppError } from "../errors";
import type { AuthUser } from "../permissions";
import type { AiProvider, StructuredReflection } from "../ai/types";
import {
  maxSessionDate,
  type reflectionSaveSchema,
  type reflectionListSchema,
} from "../validation";
import type { z } from "zod";

export type ReflectionView = {
  id: number;
  authorId: number;
  authorName: string;
  sessionTitle: string;
  sessionDate: string;
  status: "DRAFT" | "SUBMITTED";
  rawNotes: string;
  concepts: string;
  takeaways: string;
  observations: string;
  insights: string;
  openQuestions: string;
  aiStructured: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function saveReflection(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof reflectionSaveSchema>
): Promise<{ id: number }> {
  if (input.sessionDate > maxSessionDate()) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      sessionDate: "The session date cannot be in the future.",
    });
  }

  if (input.id === undefined) {
    const [inserted] = await db
      .insert(reflections)
      .values({
        authorId: actor.id,
        sessionTitle: input.sessionTitle,
        sessionDate: input.sessionDate,
        rawNotes: input.rawNotes,
        concepts: input.concepts,
        takeaways: input.takeaways,
        observations: input.observations,
        insights: input.insights,
        openQuestions: input.openQuestions,
        status: "DRAFT",
        aiStructured: false,
      })
      .returning({ id: reflections.id });

    return { id: inserted.id };
  }

  const [existing] = await db
    .select()
    .from(reflections)
    .where(eq(reflections.id, input.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  if (existing.authorId !== actor.id) {
    if (existing.status === "DRAFT") {
      throw new AppError("NOT_FOUND", "Reflection not found.");
    }
    throw new AppError(
      "FORBIDDEN",
      "You can only edit your own reflections."
    );
  }

  if (existing.status === "SUBMITTED") {
    const fieldErrors: Record<string, string> = {};
    if (!input.concepts || input.concepts.trim() === "") {
      fieldErrors.concepts = "Required";
    }
    if (!input.takeaways || input.takeaways.trim() === "") {
      fieldErrors.takeaways = "Required";
    }
    if (!input.openQuestions || input.openQuestions.trim() === "") {
      fieldErrors.openQuestions = "Required";
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new AppError(
        "VALIDATION",
        "Please correct the highlighted fields.",
        fieldErrors
      );
    }
  }

  await db
    .update(reflections)
    .set({
      sessionTitle: input.sessionTitle,
      sessionDate: input.sessionDate,
      rawNotes: input.rawNotes,
      concepts: input.concepts,
      takeaways: input.takeaways,
      observations: input.observations,
      insights: input.insights,
      openQuestions: input.openQuestions,
      updatedAt: new Date(),
    })
    .where(eq(reflections.id, input.id));

  return { id: input.id };
}

export async function structureWithAi(
  db: Db,
  actor: AuthUser,
  ai: AiProvider,
  input: { id: number }
): Promise<StructuredReflection> {
  const [existing] = await db
    .select()
    .from(reflections)
    .where(eq(reflections.id, input.id))
    .limit(1);

  if (!existing || existing.authorId !== actor.id) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  if (!existing.rawNotes || existing.rawNotes.trim() === "") {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      rawNotes: "Write some notes first.",
    });
  }

  const structured = await ai.structureReflection({
    sessionTitle: existing.sessionTitle,
    rawNotes: existing.rawNotes,
  });

  await db
    .update(reflections)
    .set({
      concepts: structured.concepts,
      takeaways: structured.takeaways,
      observations: structured.observations,
      insights: structured.insights,
      openQuestions: structured.openQuestions,
      aiStructured: true,
      updatedAt: new Date(),
    })
    .where(eq(reflections.id, input.id));

  return structured;
}

export async function clearStructured(
  db: Db,
  actor: AuthUser,
  input: { id: number }
): Promise<void> {
  const [existing] = await db
    .select()
    .from(reflections)
    .where(eq(reflections.id, input.id))
    .limit(1);

  if (!existing || existing.authorId !== actor.id) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  await db
    .update(reflections)
    .set({
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
      aiStructured: false,
      updatedAt: new Date(),
    })
    .where(eq(reflections.id, input.id));
}

export async function submitReflection(
  db: Db,
  actor: AuthUser,
  input: { id: number }
): Promise<void> {
  const [existing] = await db
    .select()
    .from(reflections)
    .where(eq(reflections.id, input.id))
    .limit(1);

  if (!existing || existing.authorId !== actor.id) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  if (existing.status === "SUBMITTED") {
    return;
  }

  const fieldErrors: Record<string, string> = {};
  if (!existing.concepts || existing.concepts.trim() === "") {
    fieldErrors.concepts = "Required to submit";
  }
  if (!existing.takeaways || existing.takeaways.trim() === "") {
    fieldErrors.takeaways = "Required to submit";
  }
  if (!existing.openQuestions || existing.openQuestions.trim() === "") {
    fieldErrors.openQuestions = "Required to submit";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(
      "VALIDATION",
      "Please correct the highlighted fields.",
      fieldErrors
    );
  }

  await db
    .update(reflections)
    .set({
      status: "SUBMITTED",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reflections.id, input.id));
}

export async function getReflection(
  db: Db,
  actor: AuthUser,
  id: number
): Promise<ReflectionView> {
  const rows = await db
    .select({
      id: reflections.id,
      authorId: reflections.authorId,
      authorName: users.name,
      sessionTitle: reflections.sessionTitle,
      sessionDate: reflections.sessionDate,
      status: reflections.status,
      rawNotes: reflections.rawNotes,
      concepts: reflections.concepts,
      takeaways: reflections.takeaways,
      observations: reflections.observations,
      insights: reflections.insights,
      openQuestions: reflections.openQuestions,
      aiStructured: reflections.aiStructured,
      submittedAt: reflections.submittedAt,
      createdAt: reflections.createdAt,
      updatedAt: reflections.updatedAt,
    })
    .from(reflections)
    .innerJoin(users, eq(reflections.authorId, users.id))
    .where(eq(reflections.id, id))
    .limit(1);

  const reflection = rows[0];

  if (!reflection) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  if (reflection.status === "DRAFT" && reflection.authorId !== actor.id) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  return reflection;
}

export async function listReflections(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof reflectionListSchema>
): Promise<{ items: ReflectionView[]; total: number; pageSize: 20 }> {
  const pageSize = 20 as const;
  const page = input.page && input.page >= 1 ? input.page : 1;
  const offset = (page - 1) * pageSize;

  const whereClause =
    input.scope === "mine"
      ? eq(reflections.authorId, actor.id)
      : or(
          eq(reflections.status, "SUBMITTED"),
          and(
            eq(reflections.authorId, actor.id),
            eq(reflections.status, "DRAFT")
          )
        );

  const [totalResult] = await db
    .select({ total: count() })
    .from(reflections)
    .where(whereClause);

  const total = totalResult ? totalResult.total : 0;

  const rows = await db
    .select({
      id: reflections.id,
      authorId: reflections.authorId,
      authorName: users.name,
      sessionTitle: reflections.sessionTitle,
      sessionDate: reflections.sessionDate,
      status: reflections.status,
      rawNotes: reflections.rawNotes,
      concepts: reflections.concepts,
      takeaways: reflections.takeaways,
      observations: reflections.observations,
      insights: reflections.insights,
      openQuestions: reflections.openQuestions,
      aiStructured: reflections.aiStructured,
      submittedAt: reflections.submittedAt,
      createdAt: reflections.createdAt,
      updatedAt: reflections.updatedAt,
    })
    .from(reflections)
    .innerJoin(users, eq(reflections.authorId, users.id))
    .where(whereClause)
    .orderBy(
      desc(
        sql`coalesce(${reflections.submittedAt}, ${reflections.createdAt})`
      )
    )
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    total,
    pageSize,
  };
}

export async function deleteReflection(
  db: Db,
  actor: AuthUser,
  input: { id: number }
): Promise<void> {
  const [existing] = await db
    .select()
    .from(reflections)
    .where(eq(reflections.id, input.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  if (existing.status === "DRAFT" && existing.authorId !== actor.id) {
    throw new AppError("NOT_FOUND", "Reflection not found.");
  }

  const isAuthorDraft =
    existing.status === "DRAFT" && existing.authorId === actor.id;
  const isInstructorSubmitted =
    existing.status === "SUBMITTED" && actor.role === "INSTRUCTOR";

  if (!isAuthorDraft && !isInstructorSubmitted) {
    throw new AppError("FORBIDDEN", "You cannot delete this reflection.");
  }

  await db.delete(reflections).where(eq(reflections.id, input.id));
}
