import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import type { Client } from "@libsql/client";
import { createTestDb } from "./test-db";
import { runMigrations } from "@/lib/db/migrate";
import type { Db } from "@/lib/db/client";
import {
  users,
  reflections,
  interactions,
  interactionNotes,
  newsItems,
} from "@/lib/db/schema";

describe("database schema and constraints", () => {
  let db: Db;
  let client: Client;
  let cleanup: () => void;
  let testUserId: number;

  beforeAll(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    client = testDb.client;
    cleanup = testDb.cleanup;
  });

  afterAll(() => {
    cleanup();
  });

  it("1. has all 5 table names in sqlite_master after migrations", async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    );
    const tableNames = result.rows.map((row) => row.name as string);

    expect(tableNames).toContain("users");
    expect(tableNames).toContain("reflections");
    expect(tableNames).toContain("interactions");
    expect(tableNames).toContain("interaction_notes");
    expect(tableNames).toContain("news_items");
  });

  it("2. inserts a user and reads it back with correct defaults", async () => {
    const [inserted] = await db
      .insert(users)
      .values({
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashed_secret_password",
      })
      .returning();

    testUserId = inserted.id;
    expect(inserted.id).toBeDefined();
    expect(inserted.email).toBe("test@example.com");
    expect(inserted.name).toBe("Test User");
    expect(inserted.role).toBe("MEMBER");
    expect(inserted.isActive).toBe(true);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("3. fails when inserting a second user with the same email", async () => {
    await expect(
      db.insert(users).values({
        email: "test@example.com",
        name: "Duplicate User",
        passwordHash: "another_hash",
      })
    ).rejects.toThrow();
  });

  it("4. inserts a reflection with required fields and verifies defaults", async () => {
    const [inserted] = await db
      .insert(reflections)
      .values({
        authorId: testUserId,
        sessionTitle: "Corporate Innovation Session 1",
        sessionDate: "2026-11-14",
      })
      .returning();

    expect(inserted.id).toBeDefined();
    expect(inserted.status).toBe("DRAFT");
    expect(inserted.aiStructured).toBe(false);
    expect(inserted.rawNotes).toBe("");
    expect(inserted.concepts).toBe("");
    expect(inserted.takeaways).toBe("");
    expect(inserted.observations).toBe("");
    expect(inserted.insights).toBe("");
    expect(inserted.openQuestions).toBe("");
    expect(inserted.submittedAt).toBeNull();
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.updatedAt).toBeInstanceOf(Date);
  });

  it("5. fails when inserting a reflection with a non-existent authorId (foreign key enforced)", async () => {
    await expect(
      db.insert(reflections).values({
        authorId: 999999,
        sessionTitle: "Invalid Author Session",
        sessionDate: "2026-11-14",
      })
    ).rejects.toThrow();
  });

  it("6. inserts an interaction, adds notes, cascades deletion of notes", async () => {
    const [insertedInteraction] = await db
      .insert(interactions)
      .values({
        authorId: testUserId,
        prompt: "What is corporate venturing?",
      })
      .returning();

    expect(insertedInteraction.status).toBe("PENDING");
    expect(insertedInteraction.response).toBeNull();

    await db.insert(interactionNotes).values([
      {
        interactionId: insertedInteraction.id,
        authorId: testUserId,
        body: "First note on venturing",
      },
      {
        interactionId: insertedInteraction.id,
        authorId: testUserId,
        body: "Second note on venturing",
      },
    ]);

    const notesBefore = await db
      .select()
      .from(interactionNotes)
      .where(eq(interactionNotes.interactionId, insertedInteraction.id));
    expect(notesBefore).toHaveLength(2);

    await db
      .delete(interactions)
      .where(eq(interactions.id, insertedInteraction.id));

    const notesAfter = await db
      .select()
      .from(interactionNotes)
      .where(eq(interactionNotes.interactionId, insertedInteraction.id));
    expect(notesAfter).toHaveLength(0);
  });

  it("7. inserts a news item with required fields and verifies defaults", async () => {
    const [insertedNews] = await db
      .insert(newsItems)
      .values({
        createdBy: testUserId,
        category: "CORPORATE_VENTURE",
        headline: "Tech fund launched",
        sourceName: "Industry Journal",
        sourceUrl: "https://example.com/news/123",
      })
      .returning();

    expect(insertedNews.id).toBeDefined();
    expect(insertedNews.status).toBe("DRAFT");
    expect(insertedNews.aiAssisted).toBe(false);
    expect(insertedNews.publishedAt).toBeNull();
    expect(insertedNews.companies).toBe("");
    expect(insertedNews.sourceText).toBe("");
    expect(insertedNews.factSummary).toBe("");
    expect(insertedNews.whyItMatters).toBe("");
  });

  it("8. running runMigrations a second time on the same DB does not throw", async () => {
    await expect(runMigrations(db)).resolves.not.toThrow();
  });
});
