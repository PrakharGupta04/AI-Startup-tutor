import { eq, desc, and, count } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/lib/db/client";
import { newsItems, users } from "@/lib/db/schema";
import { assertInstructor, type AuthUser } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import type { AiProvider } from "@/lib/ai/types";
import type { NewsCategory, NewsStatus } from "@/lib/constants";
import {
  newsSaveSchema,
  newsIdSchema,
  newsListSchema,
  parseInput,
} from "@/lib/validation";

export const NEWS_PAGE_SIZE = 12;
export const ADMIN_NEWS_PAGE_SIZE = 20;

export interface NewsPublicView {
  id: number;
  category: NewsCategory;
  headline: string;
  companies: string;
  publishedOn: string | null;
  sourceName: string;
  sourceUrl: string;
  factSummary: string;
  whyItMatters: string;
  aiAssisted: boolean;
  publishedAt: Date | null;
}

export interface NewsAdminView extends NewsPublicView {
  status: NewsStatus;
  sourceText: string;
  createdAt: Date;
  updatedAt: Date;
  createdByName: string;
}

export async function saveNews(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof newsSaveSchema> | unknown
): Promise<{ id: number }> {
  assertInstructor(actor);
  const valid = parseInput(newsSaveSchema, input);

  if (valid.id === undefined) {
    const [inserted] = await db
      .insert(newsItems)
      .values({
        createdBy: actor.id,
        status: "DRAFT",
        category: valid.category,
        headline: valid.headline,
        companies: valid.companies,
        publishedOn: valid.publishedOn,
        sourceName: valid.sourceName,
        sourceUrl: valid.sourceUrl,
        sourceText: valid.sourceText,
        factSummary: valid.factSummary,
        whyItMatters: valid.whyItMatters,
        aiAssisted: false,
        publishedAt: null,
      })
      .returning({ id: newsItems.id });

    if (!inserted) {
      throw new Error("Failed to insert news item.");
    }

    return { id: inserted.id };
  }

  const [existing] = await db
    .select({
      id: newsItems.id,
      status: newsItems.status,
    })
    .from(newsItems)
    .where(eq(newsItems.id, valid.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "News item not found.");
  }

  if (existing.status === "PUBLISHED") {
    const fieldErrors: Record<string, string> = {};
    if (!valid.factSummary.trim()) {
      fieldErrors.factSummary = "Required for a published item.";
    }
    if (!valid.whyItMatters.trim()) {
      fieldErrors.whyItMatters = "Required for a published item.";
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
    .update(newsItems)
    .set({
      category: valid.category,
      headline: valid.headline,
      companies: valid.companies,
      publishedOn: valid.publishedOn,
      sourceName: valid.sourceName,
      sourceUrl: valid.sourceUrl,
      sourceText: valid.sourceText,
      factSummary: valid.factSummary,
      whyItMatters: valid.whyItMatters,
      updatedAt: new Date(),
    })
    .where(eq(newsItems.id, existing.id));

  return { id: existing.id };
}

export async function generateNewsSummary(
  db: Db,
  actor: AuthUser,
  ai: AiProvider,
  input: z.infer<typeof newsIdSchema> | unknown
): Promise<{ factSummary: string; whyItMatters: string }> {
  assertInstructor(actor);
  const valid = parseInput(newsIdSchema, input);

  const [existing] = await db
    .select({
      id: newsItems.id,
      headline: newsItems.headline,
      companies: newsItems.companies,
      sourceName: newsItems.sourceName,
      sourceText: newsItems.sourceText,
    })
    .from(newsItems)
    .where(eq(newsItems.id, valid.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "News item not found.");
  }

  if (!existing.sourceText.trim()) {
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", {
      sourceText: "Paste the article text first.",
    });
  }

  const summary = await ai.summarizeNews({
    headline: existing.headline,
    companies: existing.companies,
    sourceName: existing.sourceName,
    sourceText: existing.sourceText,
  });

  await db
    .update(newsItems)
    .set({
      factSummary: summary.factSummary,
      whyItMatters: summary.whyItMatters,
      aiAssisted: true,
      updatedAt: new Date(),
    })
    .where(eq(newsItems.id, existing.id));

  return {
    factSummary: summary.factSummary,
    whyItMatters: summary.whyItMatters,
  };
}

export async function publishNews(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof newsIdSchema> | unknown
): Promise<void> {
  assertInstructor(actor);
  const valid = parseInput(newsIdSchema, input);

  const [existing] = await db
    .select({
      id: newsItems.id,
      factSummary: newsItems.factSummary,
      whyItMatters: newsItems.whyItMatters,
    })
    .from(newsItems)
    .where(eq(newsItems.id, valid.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "News item not found.");
  }

  const fieldErrors: Record<string, string> = {};
  if (!existing.factSummary.trim()) {
    fieldErrors.factSummary = "Required to publish.";
  }
  if (!existing.whyItMatters.trim()) {
    fieldErrors.whyItMatters = "Required to publish.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(
      "VALIDATION",
      "Please correct the highlighted fields.",
      fieldErrors
    );
  }

  await db
    .update(newsItems)
    .set({
      status: "PUBLISHED",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newsItems.id, existing.id));
}

export async function unpublishNews(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof newsIdSchema> | unknown
): Promise<void> {
  assertInstructor(actor);
  const valid = parseInput(newsIdSchema, input);

  const [existing] = await db
    .select({ id: newsItems.id })
    .from(newsItems)
    .where(eq(newsItems.id, valid.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "News item not found.");
  }

  await db
    .update(newsItems)
    .set({
      status: "DRAFT",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(newsItems.id, existing.id));
}

export async function deleteNews(
  db: Db,
  actor: AuthUser,
  input: z.infer<typeof newsIdSchema> | unknown
): Promise<void> {
  assertInstructor(actor);
  const valid = parseInput(newsIdSchema, input);

  const [existing] = await db
    .select({ id: newsItems.id })
    .from(newsItems)
    .where(eq(newsItems.id, valid.id))
    .limit(1);

  if (!existing) {
    throw new AppError("NOT_FOUND", "News item not found.");
  }

  await db.delete(newsItems).where(eq(newsItems.id, existing.id));
}

export async function listPublishedNews(
  db: Db,
  _actor: AuthUser,
  input: z.infer<typeof newsListSchema> | unknown
): Promise<{ items: NewsPublicView[]; total: number; pageSize: number }> {
  const valid = parseInput(newsListSchema, input);
  const pageSize = NEWS_PAGE_SIZE;
  const page = valid.page && valid.page >= 1 ? valid.page : 1;
  const offset = (page - 1) * pageSize;

  const whereClause = valid.category
    ? and(
        eq(newsItems.status, "PUBLISHED"),
        eq(newsItems.category, valid.category)
      )
    : eq(newsItems.status, "PUBLISHED");

  const [totalResult] = await db
    .select({ total: count() })
    .from(newsItems)
    .where(whereClause);
  const total = totalResult ? totalResult.total : 0;

  const rows = await db
    .select({
      id: newsItems.id,
      category: newsItems.category,
      headline: newsItems.headline,
      companies: newsItems.companies,
      publishedOn: newsItems.publishedOn,
      sourceName: newsItems.sourceName,
      sourceUrl: newsItems.sourceUrl,
      factSummary: newsItems.factSummary,
      whyItMatters: newsItems.whyItMatters,
      aiAssisted: newsItems.aiAssisted,
      publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(whereClause)
    .orderBy(desc(newsItems.publishedAt), desc(newsItems.id))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    total,
    pageSize,
  };
}

export async function listAllNews(
  db: Db,
  actor: AuthUser,
  input: { page?: number } | unknown
): Promise<{ items: NewsAdminView[]; total: number; pageSize: number }> {
  assertInstructor(actor);
  const valid = parseInput(newsListSchema, input);
  const pageSize = ADMIN_NEWS_PAGE_SIZE;
  const page = valid.page && valid.page >= 1 ? valid.page : 1;
  const offset = (page - 1) * pageSize;

  const [totalResult] = await db
    .select({ total: count() })
    .from(newsItems);
  const total = totalResult ? totalResult.total : 0;

  const rows = await db
    .select({
      id: newsItems.id,
      category: newsItems.category,
      headline: newsItems.headline,
      companies: newsItems.companies,
      publishedOn: newsItems.publishedOn,
      sourceName: newsItems.sourceName,
      sourceUrl: newsItems.sourceUrl,
      factSummary: newsItems.factSummary,
      whyItMatters: newsItems.whyItMatters,
      aiAssisted: newsItems.aiAssisted,
      publishedAt: newsItems.publishedAt,
      status: newsItems.status,
      sourceText: newsItems.sourceText,
      createdAt: newsItems.createdAt,
      updatedAt: newsItems.updatedAt,
      createdByName: users.name,
    })
    .from(newsItems)
    .innerJoin(users, eq(newsItems.createdBy, users.id))
    .orderBy(desc(newsItems.updatedAt), desc(newsItems.id))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    total,
    pageSize,
  };
}

export async function getNewsForEdit(
  db: Db,
  actor: AuthUser,
  id: number
): Promise<NewsAdminView> {
  assertInstructor(actor);
  const valid = parseInput(newsIdSchema, { id });

  const rows = await db
    .select({
      id: newsItems.id,
      category: newsItems.category,
      headline: newsItems.headline,
      companies: newsItems.companies,
      publishedOn: newsItems.publishedOn,
      sourceName: newsItems.sourceName,
      sourceUrl: newsItems.sourceUrl,
      factSummary: newsItems.factSummary,
      whyItMatters: newsItems.whyItMatters,
      aiAssisted: newsItems.aiAssisted,
      publishedAt: newsItems.publishedAt,
      status: newsItems.status,
      sourceText: newsItems.sourceText,
      createdAt: newsItems.createdAt,
      updatedAt: newsItems.updatedAt,
      createdByName: users.name,
    })
    .from(newsItems)
    .innerJoin(users, eq(newsItems.createdBy, users.id))
    .where(eq(newsItems.id, valid.id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new AppError("NOT_FOUND", "News item not found.");
  }

  return row;
}
