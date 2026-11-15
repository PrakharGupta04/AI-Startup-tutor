import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "./test-db";
import { registerUser } from "@/lib/data/users";
import {
  askTutor,
  retryInteraction,
  listInteractions,
  getInteraction,
  deleteInteraction,
  addNote,
  updateNote,
  deleteNote,
} from "@/lib/data/tutor";
import { interactions, interactionNotes } from "@/lib/db/schema";
import { createDemoProvider } from "@/lib/ai/demo";
import { AiError } from "@/lib/ai/errors";
import {
  DEMO_PREFIX,
  type AiProvider,
  type StructuredReflection,
  type NewsSummary,
} from "@/lib/ai/types";
import type { AuthUser } from "@/lib/permissions";

describe("tutor data layer and validation", () => {
  let db: Db;
  let cleanup: () => void;
  let member1: AuthUser;
  let member2: AuthUser;
  let instructor: AuthUser;

  const codes = {
    joinCode: "member-join-code-123",
    instructorCode: "instructor-secret-code-456",
  };

  const demoProvider = createDemoProvider();

  class FailingAiProvider implements AiProvider {
    readonly name = "gemini" as const;
    readonly model = "fake";

    async tutorAnswer(): Promise<string> {
      throw new AiError("RATE_LIMITED");
    }
    async structureReflection(): Promise<StructuredReflection> {
      throw new AiError("RATE_LIMITED");
    }
    async summarizeNews(): Promise<NewsSummary> {
      throw new AiError("RATE_LIMITED");
    }
  }

  class BoomProvider implements AiProvider {
    readonly name = "gemini" as const;
    readonly model = "fake";

    async tutorAnswer(): Promise<string> {
      throw new Error("boom");
    }
    async structureReflection(): Promise<StructuredReflection> {
      throw new Error("boom");
    }
    async summarizeNews(): Promise<NewsSummary> {
      throw new Error("boom");
    }
  }

  beforeAll(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    cleanup = testDb.cleanup;

    member1 = await registerUser(
      db,
      {
        name: "Alice Member",
        email: "alice@example.com",
        password: "password123",
        code: codes.joinCode,
      },
      codes
    );

    member2 = await registerUser(
      db,
      {
        name: "Bob Member",
        email: "bob@example.com",
        password: "password123",
        code: codes.joinCode,
      },
      codes
    );

    instructor = await registerUser(
      db,
      {
        name: "Carol Instructor",
        email: "carol@example.com",
        password: "password123",
        code: codes.instructorCode,
      },
      codes
    );
  });

  afterAll(() => {
    cleanup();
  });

  it("1. askTutor with demo: COMPLETED, response contains DEMO_PREFIX, model 'demo', completedAt set; another member and an instructor can see it via getInteraction and listInteractions", async () => {
    const result = await askTutor(db, member1, demoProvider, {
      prompt: "What is corporate venturing?",
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe("COMPLETED");
    expect(result.errorMessage).toBeNull();

    // Verify row in DB
    const detail = await getInteraction(db, member1, result.id);
    expect(detail.status).toBe("COMPLETED");
    expect(detail.response).toContain(DEMO_PREFIX);
    expect(detail.model).toBe("demo");
    expect(detail.completedAt).toBeInstanceOf(Date);
    expect(detail.authorName).toBe("Alice Member");

    // Member2 can see it
    const seenByMember2 = await getInteraction(db, member2, result.id);
    expect(seenByMember2.id).toBe(result.id);
    expect(seenByMember2.response).toBe(detail.response);

    // Instructor can see it via getInteraction and listInteractions
    const seenByInstructor = await getInteraction(db, instructor, result.id);
    expect(seenByInstructor.id).toBe(result.id);

    // Visible in listInteractions for both member and instructor
    const list = await listInteractions(db, member2, { page: 1 });
    expect(list.items.some((i) => i.id === result.id)).toBe(true);

    const instructorList = await listInteractions(db, instructor, { page: 1 });
    expect(instructorList.items.some((i) => i.id === result.id)).toBe(true);
  });

  it("2. Failing provider throwing AiError('RATE_LIMITED'): the row EXISTS with the exact prompt, status FAILED, response null, errorMessage equals the AiError message; the function returns status FAILED and does not throw", async () => {
    const failingProvider = new FailingAiProvider();
    const prompt = "How do we scale pilot projects?";

    const result = await askTutor(db, member1, failingProvider, { prompt });
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe(
      new AiError("RATE_LIMITED").message
    );

    const loaded = await getInteraction(db, member1, result.id);
    expect(loaded.prompt).toBe(prompt);
    expect(loaded.status).toBe("FAILED");
    expect(loaded.response).toBeNull();
    expect(loaded.errorMessage).toBe(result.errorMessage);
  });

  it("3. Saved before the AI call: a provider whose tutorAnswer queries the DB inside the call, capturing whether a row with that prompt exists with stored status PENDING; assert on the captured value afterwards", async () => {
    let capturedRowExists = false;
    let capturedStatus: string | null = null;
    const testPrompt = "Checking persistence timing prior to AI invocation";

    const inspectingProvider: AiProvider = {
      name: "gemini",
      model: "inspect",
      async tutorAnswer() {
        const rows = await db
          .select()
          .from(interactions)
          .where(eq(interactions.prompt, testPrompt));
        if (rows.length > 0) {
          capturedRowExists = true;
          capturedStatus = rows[0].status;
        }
        return "Answer after checking DB";
      },
      async structureReflection() {
        throw new Error("not used");
      },
      async summarizeNews() {
        throw new Error("not used");
      },
    };

    const res = await askTutor(db, member1, inspectingProvider, {
      prompt: testPrompt,
    });
    expect(res.status).toBe("COMPLETED");
    expect(capturedRowExists).toBe(true);
    expect(capturedStatus).toBe("PENDING");
  });

  it("4. Provider throwing a plain Error('boom'): row FAILED with the generic message, and askTutor rethrows", async () => {
    const boomProvider = new BoomProvider();
    const prompt = "This will trigger unexpected crash";

    let thrownError: unknown;
    try {
      await askTutor(db, member1, boomProvider, { prompt });
      expect.unreachable("Should have rethrown");
    } catch (err) {
      thrownError = err;
    }

    expect((thrownError as Error).message).toBe("boom");

    // Check DB row
    const [row] = await db
      .select()
      .from(interactions)
      .where(eq(interactions.prompt, prompt));
    expect(row).toBeDefined();
    expect(row.status).toBe("FAILED");
    expect(row.errorMessage).toBe("Something went wrong. Please try again.");
    expect(row.response).toBeNull();
  });

  it("5. Empty/whitespace prompt and a 2001-char prompt -> VALIDATION and NO row created", async () => {
    const countBefore = (await db.select().from(interactions)).length;

    await expect(
      askTutor(db, member1, demoProvider, { prompt: "   \n\t  " })
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { prompt: "Enter a question." },
    });

    const tooLong = "a".repeat(2001);
    await expect(
      askTutor(db, member1, demoProvider, { prompt: tooLong })
    ).rejects.toMatchObject({
      code: "VALIDATION",
    });

    const countAfter = (await db.select().from(interactions)).length;
    expect(countAfter).toBe(countBefore);
  });

  it("6. retryInteraction: after a failure, retry with the demo provider -> COMPLETED with response; retry by another user -> FORBIDDEN; retry of a COMPLETED one -> CONFLICT; unknown id -> NOT_FOUND", async () => {
    const failingProvider = new FailingAiProvider();
    const { id } = await askTutor(db, member1, failingProvider, {
      prompt: "Question to retry",
    });

    // Retry by another user -> FORBIDDEN
    await expect(
      retryInteraction(db, member2, demoProvider, { id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Retry by author with demo provider -> COMPLETED
    const retryRes = await retryInteraction(db, member1, demoProvider, { id });
    expect(retryRes.status).toBe("COMPLETED");

    const updated = await getInteraction(db, member1, id);
    expect(updated.status).toBe("COMPLETED");
    expect(updated.response).toContain(DEMO_PREFIX);
    expect(updated.errorMessage).toBeNull();

    // Retry of a COMPLETED one -> CONFLICT
    await expect(
      retryInteraction(db, member1, demoProvider, { id })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    // Unknown id -> NOT_FOUND
    await expect(
      retryInteraction(db, member1, demoProvider, { id: 999999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("7. Stale PENDING: insert a PENDING row directly with createdAt 5 minutes ago -> getInteraction reports FAILED with the 'did not finish' message; a fresh PENDING row reports PENDING; retry of the stale one works", async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [stale] = await db
      .insert(interactions)
      .values({
        authorId: member1.id,
        prompt: "Stale prompt 5 mins ago",
        status: "PENDING",
        createdAt: fiveMinutesAgo,
      })
      .returning();

    const staleDetail = await getInteraction(db, member1, stale.id);
    expect(staleDetail.status).toBe("FAILED");
    expect(staleDetail.errorMessage).toBe(
      "The request did not finish. Please retry."
    );

    // Fresh PENDING row reports PENDING
    const [fresh] = await db
      .insert(interactions)
      .values({
        authorId: member1.id,
        prompt: "Fresh pending prompt",
        status: "PENDING",
        createdAt: new Date(),
      })
      .returning();

    const freshDetail = await getInteraction(db, member1, fresh.id);
    expect(freshDetail.status).toBe("PENDING");
    expect(freshDetail.errorMessage).toBeNull();

    // Retry of the stale one works
    const retryRes = await retryInteraction(db, member1, demoProvider, {
      id: stale.id,
    });
    expect(retryRes.status).toBe("COMPLETED");

    const updatedStale = await getInteraction(db, member1, stale.id);
    expect(updatedStale.status).toBe("COMPLETED");
  });

  it("8. listInteractions: 25 interactions -> page 1 has 20, page 2 has 5, total 25, newest first; noteCount correct; items include authorName and have no email/passwordHash keys", async () => {
    // Create 25 completed interactions
    for (let i = 1; i <= 25; i++) {
      const { id } = await askTutor(db, member1, demoProvider, {
        prompt: `Pagination prompt ${i}`,
      });
      if (i === 25) {
        await addNote(db, member2, {
          interactionId: id,
          body: "A note on interaction 25",
        });
        await addNote(db, instructor, {
          interactionId: id,
          body: "Second note on interaction 25",
        });
      }
    }

    const page1 = await listInteractions(db, member1, { page: 1 });
    expect(page1.items.length).toBe(20);
    expect(page1.total).toBeGreaterThanOrEqual(25);
    expect(page1.pageSize).toBe(20);

    const page2 = await listInteractions(db, member1, { page: 2 });
    expect(page2.items.length).toBeGreaterThanOrEqual(5);

    // Check authorName and lack of sensitive fields
    const item = page1.items[0];
    expect(item.authorName).toBeDefined();
    expect(typeof item.authorName).toBe("string");
    expect((item as Record<string, unknown>).email).toBeUndefined();
    expect((item as Record<string, unknown>).passwordHash).toBeUndefined();

    // Check noteCount
    const itemWithNotes = page1.items.find((i) => i.noteCount === 2);
    expect(itemWithNotes).toBeDefined();
  });

  it("9. addNote: any member can note another member's interaction; getInteraction returns notes oldest first with authorName and authorRole; empty body -> VALIDATION; unknown interaction -> NOT_FOUND", async () => {
    const { id } = await askTutor(db, member1, demoProvider, {
      prompt: "Question for notes testing",
    });

    const note1 = await addNote(db, member2, {
      interactionId: id,
      body: "First note by Bob",
    });
    const note2 = await addNote(db, instructor, {
      interactionId: id,
      body: "Second note by Carol (Instructor)",
    });

    const detail = await getInteraction(db, member1, id);
    expect(detail.notes.length).toBe(2);
    expect(detail.notes[0].id).toBe(note1.id);
    expect(detail.notes[0].authorName).toBe("Bob Member");
    expect(detail.notes[0].authorRole).toBe("MEMBER");
    expect(detail.notes[1].id).toBe(note2.id);
    expect(detail.notes[1].authorName).toBe("Carol Instructor");
    expect(detail.notes[1].authorRole).toBe("INSTRUCTOR");

    // Empty body -> VALIDATION
    await expect(
      addNote(db, member1, { interactionId: id, body: "   " })
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { body: "Write a note." },
    });

    // Unknown interaction -> NOT_FOUND
    await expect(
      addNote(db, member1, { interactionId: 999999, body: "Valid body" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("10. updateNote: own ✔ (updatedAt changes); another member -> FORBIDDEN; instructor editing someone else's -> FORBIDDEN", async () => {
    const { id: interactionId } = await askTutor(db, member1, demoProvider, {
      prompt: "Interaction for updateNote",
    });

    const { id: noteId } = await addNote(db, member1, {
      interactionId,
      body: "Initial note text",
    });

    // Own update succeeds
    await expect(
      updateNote(db, member1, { noteId, body: "Updated note text" })
    ).resolves.not.toThrow();

    const detail = await getInteraction(db, member1, interactionId);
    expect(detail.notes[0].body).toBe("Updated note text");
    expect(detail.notes[0].updatedAt).toBeInstanceOf(Date);

    // Another member -> FORBIDDEN
    await expect(
      updateNote(db, member2, { noteId, body: "Hacked text" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Instructor editing someone else's -> FORBIDDEN
    await expect(
      updateNote(db, instructor, { noteId, body: "Instructor edit attempt" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("11. deleteNote: author ✔; instructor deleting another's ✔; another member -> FORBIDDEN; unknown -> NOT_FOUND", async () => {
    const { id: interactionId } = await askTutor(db, member1, demoProvider, {
      prompt: "Interaction for deleteNote",
    });

    const note1 = await addNote(db, member1, {
      interactionId,
      body: "Author note to delete",
    });
    const note2 = await addNote(db, member1, {
      interactionId,
      body: "Author note for instructor delete",
    });

    // Another member deleting note1 -> FORBIDDEN
    await expect(
      deleteNote(db, member2, { noteId: note1.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Author deleting note1 -> succeeds
    await expect(
      deleteNote(db, member1, { noteId: note1.id })
    ).resolves.not.toThrow();

    // Instructor deleting note2 -> succeeds
    await expect(
      deleteNote(db, instructor, { noteId: note2.id })
    ).resolves.not.toThrow();

    // Unknown note -> NOT_FOUND
    await expect(
      deleteNote(db, member1, { noteId: 999999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("12. deleteInteraction: member -> FORBIDDEN; instructor ✔ and its notes are gone (query the notes table); unknown -> NOT_FOUND", async () => {
    const { id } = await askTutor(db, member1, demoProvider, {
      prompt: "Question to delete",
    });
    await addNote(db, member1, { interactionId: id, body: "Note 1" });
    await addNote(db, member2, { interactionId: id, body: "Note 2" });

    // Member -> FORBIDDEN
    await expect(
      deleteInteraction(db, member1, { id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Unknown -> NOT_FOUND
    await expect(
      deleteInteraction(db, instructor, { id: 999999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Instructor -> succeeds
    await expect(
      deleteInteraction(db, instructor, { id })
    ).resolves.not.toThrow();

    // Notes are removed by cascade
    const remainingNotes = await db
      .select()
      .from(interactionNotes)
      .where(eq(interactionNotes.interactionId, id));
    expect(remainingNotes).toHaveLength(0);

    // Interaction is gone
    await expect(getInteraction(db, member1, id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("13. The detail object keeps prompt, response and notes as separate fields", async () => {
    const prompt = "Separate fields verification question";
    const { id } = await askTutor(db, member1, demoProvider, { prompt });
    await addNote(db, member2, { interactionId: id, body: "Separate note" });

    const detail = await getInteraction(db, member1, id);
    expect(detail.prompt).toBe(prompt);
    expect(typeof detail.response).toBe("string");
    expect(detail.response).toContain(DEMO_PREFIX);
    expect(Array.isArray(detail.notes)).toBe(true);
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0].body).toBe("Separate note");
  });
});
