import { integer, text, sqliteTable, index } from "drizzle-orm/sqlite-core";
import {
  ROLES,
  REFLECTION_STATUSES,
  INTERACTION_STATUSES,
  NEWS_STATUSES,
  NEWS_CATEGORIES,
} from "../constants";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("MEMBER"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const reflections = sqliteTable(
  "reflections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    sessionTitle: text("session_title").notNull(),
    sessionDate: text("session_date").notNull(),
    status: text("status", { enum: REFLECTION_STATUSES })
      .notNull()
      .default("DRAFT"),
    rawNotes: text("raw_notes").notNull().default(""),
    concepts: text("concepts").notNull().default(""),
    takeaways: text("takeaways").notNull().default(""),
    observations: text("observations").notNull().default(""),
    insights: text("insights").notNull().default(""),
    openQuestions: text("open_questions").notNull().default(""),
    aiStructured: integer("ai_structured", { mode: "boolean" })
      .notNull()
      .default(false),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("reflections_status_submitted_idx").on(table.status, table.submittedAt),
    index("reflections_author_idx").on(table.authorId),
  ]
);

export const interactions = sqliteTable(
  "interactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    prompt: text("prompt").notNull(),
    response: text("response"),
    status: text("status", { enum: INTERACTION_STATUSES })
      .notNull()
      .default("PENDING"),
    errorMessage: text("error_message"),
    model: text("model"),
    createdAt: createdAt(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("interactions_created_idx").on(table.createdAt),
  ]
);

export const interactionNotes = sqliteTable(
  "interaction_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    interactionId: integer("interaction_id")
      .notNull()
      .references(() => interactions.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("interaction_notes_interaction_idx").on(table.interactionId),
  ]
);

export const newsItems = sqliteTable(
  "news_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    status: text("status", { enum: NEWS_STATUSES }).notNull().default("DRAFT"),
    category: text("category", { enum: NEWS_CATEGORIES }).notNull(),
    headline: text("headline").notNull(),
    companies: text("companies").notNull().default(""),
    publishedOn: text("published_on"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceText: text("source_text").notNull().default(""),
    factSummary: text("fact_summary").notNull().default(""),
    whyItMatters: text("why_it_matters").notNull().default(""),
    aiAssisted: integer("ai_assisted", { mode: "boolean" })
      .notNull()
      .default(false),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("news_items_status_published_idx").on(table.status, table.publishedAt),
  ]
);
