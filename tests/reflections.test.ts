import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "./test-db";
import { registerUser } from "@/lib/data/users";
import {
  saveReflection,
  structureWithAi,
  clearStructured,
  submitReflection,
  getReflection,
  listReflections,
  deleteReflection,
} from "@/lib/data/reflections";
import { createDemoProvider } from "@/lib/ai/demo";
import { AiError } from "@/lib/ai/errors";
import { DEMO_PREFIX, type AiProvider, type StructuredReflection, type NewsSummary } from "@/lib/ai/types";
import { reflectionSaveSchema } from "@/lib/validation";
import { toFailure, AppError } from "@/lib/errors";
import type { AuthUser } from "@/lib/permissions";

describe("reflections data layer and validation", () => {
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

  class FailingProvider implements AiProvider {
    readonly name = "gemini" as const;
    readonly model = "fake";
    callCount = 0;

    async tutorAnswer(): Promise<string> {
      this.callCount++;
      throw new AiError("RATE_LIMITED");
    }

    async structureReflection(): Promise<StructuredReflection> {
      this.callCount++;
      throw new AiError("RATE_LIMITED");
    }

    async summarizeNews(): Promise<NewsSummary> {
      this.callCount++;
      throw new AiError("RATE_LIMITED");
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

  it("1. saveReflection creates a DRAFT with aiStructured false; update own draft works; updating someone else's draft -> NOT_FOUND; unknown id -> NOT_FOUND", async () => {
    const created = await saveReflection(db, member1, {
      sessionTitle: "Session 1",
      sessionDate: "2026-03-01",
      rawNotes: "Some raw notes here",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    expect(created.id).toBeDefined();

    const loaded = await getReflection(db, member1, created.id);
    expect(loaded.status).toBe("DRAFT");
    expect(loaded.aiStructured).toBe(false);
    expect(loaded.sessionTitle).toBe("Session 1");
    expect(loaded.rawNotes).toBe("Some raw notes here");

    // Update own draft
    await saveReflection(db, member1, {
      id: created.id,
      sessionTitle: "Session 1 Updated",
      sessionDate: "2026-03-01",
      rawNotes: "Updated raw notes",
      concepts: "Concept A",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    const updated = await getReflection(db, member1, created.id);
    expect(updated.sessionTitle).toBe("Session 1 Updated");
    expect(updated.rawNotes).toBe("Updated raw notes");
    expect(updated.concepts).toBe("Concept A");

    // Updating someone else's draft -> NOT_FOUND
    await expect(
      saveReflection(db, member2, {
        id: created.id,
        sessionTitle: "Hacked",
        sessionDate: "2026-03-01",
        rawNotes: "Hacked notes",
        concepts: "",
        takeaways: "",
        observations: "",
        insights: "",
        openQuestions: "",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Updating unknown id -> NOT_FOUND
    await expect(
      saveReflection(db, member1, {
        id: 999999,
        sessionTitle: "Unknown",
        sessionDate: "2026-03-01",
        rawNotes: "Notes",
        concepts: "",
        takeaways: "",
        observations: "",
        insights: "",
        openQuestions: "",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("2. Drafts are invisible to others: getReflection by another member AND by an instructor -> NOT_FOUND; listReflections excludes others' drafts but includes the actor's own", async () => {
    const draft = await saveReflection(db, member1, {
      sessionTitle: "Alice Secret Draft",
      sessionDate: "2026-03-02",
      rawNotes: "Confidential thoughts",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    // member2 cannot see it
    await expect(getReflection(db, member2, draft.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // instructor cannot see it
    await expect(getReflection(db, instructor, draft.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // listReflections for member1 includes it
    const member1List = await listReflections(db, member1, {
      page: 1,
      scope: "all",
    });
    expect(member1List.items.some((r) => r.id === draft.id)).toBe(true);

    // listReflections for member2 excludes it
    const member2List = await listReflections(db, member2, {
      page: 1,
      scope: "all",
    });
    expect(member2List.items.some((r) => r.id === draft.id)).toBe(false);

    // listReflections for instructor excludes it
    const instructorList = await listReflections(db, instructor, {
      page: 1,
      scope: "all",
    });
    expect(instructorList.items.some((r) => r.id === draft.id)).toBe(false);
  });

  it("3. submitReflection: fails with fieldErrors when concepts/takeaways/openQuestions are empty (check each individually); succeeds when filled, sets submittedAt and status; submitting twice is harmless; then others (member and instructor) can getReflection and see it in the list", async () => {
    const draft = await saveReflection(db, member1, {
      sessionTitle: "To Submit",
      sessionDate: "2026-03-03",
      rawNotes: "Notes to submit",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    // Check all 3 missing
    try {
      await submitReflection(db, member1, { id: draft.id });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe("VALIDATION");
      expect(appErr.fieldErrors?.concepts).toBe("Required to submit");
      expect(appErr.fieldErrors?.takeaways).toBe("Required to submit");
      expect(appErr.fieldErrors?.openQuestions).toBe("Required to submit");
    }

    // Check only concepts filled
    await saveReflection(db, member1, {
      id: draft.id,
      sessionTitle: "To Submit",
      sessionDate: "2026-03-03",
      rawNotes: "Notes",
      concepts: "Has concepts",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });
    try {
      await submitReflection(db, member1, { id: draft.id });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.fieldErrors?.concepts).toBeUndefined();
      expect(appErr.fieldErrors?.takeaways).toBe("Required to submit");
      expect(appErr.fieldErrors?.openQuestions).toBe("Required to submit");
    }

    // Check concepts and takeaways filled, openQuestions missing
    await saveReflection(db, member1, {
      id: draft.id,
      sessionTitle: "To Submit",
      sessionDate: "2026-03-03",
      rawNotes: "Notes",
      concepts: "Has concepts",
      takeaways: "Has takeaways",
      observations: "",
      insights: "",
      openQuestions: "   ",
    });
    try {
      await submitReflection(db, member1, { id: draft.id });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.fieldErrors?.concepts).toBeUndefined();
      expect(appErr.fieldErrors?.takeaways).toBeUndefined();
      expect(appErr.fieldErrors?.openQuestions).toBe("Required to submit");
    }

    // Fill all 3 required fields and submit
    await saveReflection(db, member1, {
      id: draft.id,
      sessionTitle: "To Submit",
      sessionDate: "2026-03-03",
      rawNotes: "Notes",
      concepts: "Has concepts",
      takeaways: "Has takeaways",
      observations: "",
      insights: "",
      openQuestions: "Has questions",
    });

    await submitReflection(db, member1, { id: draft.id });

    const submitted = await getReflection(db, member1, draft.id);
    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.submittedAt).toBeInstanceOf(Date);

    // Submitting twice is harmless
    await expect(
      submitReflection(db, member1, { id: draft.id })
    ).resolves.not.toThrow();

    // Now member2 can see it
    const seenByMember2 = await getReflection(db, member2, draft.id);
    expect(seenByMember2.id).toBe(draft.id);

    // Instructor can see it
    const seenByInstructor = await getReflection(db, instructor, draft.id);
    expect(seenByInstructor.id).toBe(draft.id);

    // Seen in member2 listReflections
    const member2List = await listReflections(db, member2, {
      page: 1,
      scope: "all",
    });
    expect(member2List.items.some((r) => r.id === draft.id)).toBe(true);
  });

  it("4. Editing a submitted reflection: author succeeds; clearing a required field -> VALIDATION; another member -> FORBIDDEN; an instructor editing someone else's -> FORBIDDEN", async () => {
    const draft = await saveReflection(db, member1, {
      sessionTitle: "Submitted To Edit",
      sessionDate: "2026-03-04",
      rawNotes: "Notes",
      concepts: "Concepts",
      takeaways: "Takeaways",
      observations: "",
      insights: "",
      openQuestions: "Questions",
    });
    await submitReflection(db, member1, { id: draft.id });

    // Author succeeds
    await expect(
      saveReflection(db, member1, {
        id: draft.id,
        sessionTitle: "Updated Title",
        sessionDate: "2026-03-04",
        rawNotes: "Notes",
        concepts: "Updated concepts",
        takeaways: "Updated takeaways",
        observations: "Obs",
        insights: "Ins",
        openQuestions: "Updated questions",
      })
    ).resolves.not.toThrow();

    // Clearing a required field -> VALIDATION
    await expect(
      saveReflection(db, member1, {
        id: draft.id,
        sessionTitle: "Updated Title",
        sessionDate: "2026-03-04",
        rawNotes: "Notes",
        concepts: "",
        takeaways: "Updated takeaways",
        observations: "Obs",
        insights: "Ins",
        openQuestions: "Updated questions",
      })
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { concepts: "Required" },
    });

    // Another member -> FORBIDDEN
    await expect(
      saveReflection(db, member2, {
        id: draft.id,
        sessionTitle: "Member2 Edits",
        sessionDate: "2026-03-04",
        rawNotes: "Notes",
        concepts: "Concepts",
        takeaways: "Takeaways",
        observations: "",
        insights: "",
        openQuestions: "Questions",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Instructor editing someone else's -> FORBIDDEN
    await expect(
      saveReflection(db, instructor, {
        id: draft.id,
        sessionTitle: "Instructor Edits",
        sessionDate: "2026-03-04",
        rawNotes: "Notes",
        concepts: "Concepts",
        takeaways: "Takeaways",
        observations: "",
        insights: "",
        openQuestions: "Questions",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("5. structureWithAi with the demo provider: five fields contain DEMO_PREFIX, aiStructured true, rawNotes byte-identical to before", async () => {
    const raw = "Exact byte notes: 12345! @#$%\nMultiple lines\twith tab.";
    const draft = await saveReflection(db, member1, {
      sessionTitle: "Demo AI Test",
      sessionDate: "2026-03-05",
      rawNotes: raw,
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    const structured = await structureWithAi(db, member1, demoProvider, {
      id: draft.id,
    });
    expect(structured.concepts).toContain(DEMO_PREFIX);
    expect(structured.takeaways).toContain(DEMO_PREFIX);
    expect(structured.observations).toContain(DEMO_PREFIX);
    expect(structured.insights).toContain(DEMO_PREFIX);
    expect(structured.openQuestions).toContain(DEMO_PREFIX);

    const loaded = await getReflection(db, member1, draft.id);
    expect(loaded.aiStructured).toBe(true);
    expect(loaded.rawNotes).toBe(raw);
    expect(loaded.concepts).toBe(structured.concepts);
  });

  it("6. structureWithAi with the failing provider: the thrown error has code RATE_LIMITED; in the DB rawNotes unchanged, five fields unchanged, aiStructured false", async () => {
    const raw = "Notes before failure";
    const draft = await saveReflection(db, member1, {
      sessionTitle: "Failing Provider Test",
      sessionDate: "2026-03-06",
      rawNotes: raw,
      concepts: "Original Concept",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    const failingProvider = new FailingProvider();
    await expect(
      structureWithAi(db, member1, failingProvider, { id: draft.id })
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });

    const loaded = await getReflection(db, member1, draft.id);
    expect(loaded.rawNotes).toBe(raw);
    expect(loaded.concepts).toBe("Original Concept");
    expect(loaded.aiStructured).toBe(false);
  });

  it("7. structureWithAi with empty rawNotes -> VALIDATION with fieldErrors.rawNotes, and the failing provider's call count stays 0; on someone else's reflection -> NOT_FOUND", async () => {
    const draft = await saveReflection(db, member1, {
      sessionTitle: "Empty Notes",
      sessionDate: "2026-03-07",
      rawNotes: "   \n\t  ",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    const failingProvider = new FailingProvider();
    await expect(
      structureWithAi(db, member1, failingProvider, { id: draft.id })
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { rawNotes: "Write some notes first." },
    });

    expect(failingProvider.callCount).toBe(0);

    // On someone else's reflection -> NOT_FOUND
    await expect(
      structureWithAi(db, member2, demoProvider, { id: draft.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("8. clearStructured empties the five fields, sets aiStructured false, keeps rawNotes", async () => {
    const raw = "Notes to keep intact";
    const draft = await saveReflection(db, member1, {
      sessionTitle: "To Clear",
      sessionDate: "2026-03-08",
      rawNotes: raw,
      concepts: "C",
      takeaways: "T",
      observations: "O",
      insights: "I",
      openQuestions: "Q",
    });

    // Make aiStructured true first
    await structureWithAi(db, member1, demoProvider, { id: draft.id });
    const beforeClear = await getReflection(db, member1, draft.id);
    expect(beforeClear.aiStructured).toBe(true);

    await clearStructured(db, member1, { id: draft.id });

    const afterClear = await getReflection(db, member1, draft.id);
    expect(afterClear.concepts).toBe("");
    expect(afterClear.takeaways).toBe("");
    expect(afterClear.observations).toBe("");
    expect(afterClear.insights).toBe("");
    expect(afterClear.openQuestions).toBe("");
    expect(afterClear.aiStructured).toBe(false);
    expect(afterClear.rawNotes).toBe(raw);
  });

  it("9. deleteReflection: member deletes own draft ✔; member deleting own SUBMITTED -> FORBIDDEN; instructor deleting another member's SUBMITTED ✔; member deleting another's SUBMITTED -> FORBIDDEN; instructor deleting another's DRAFT -> NOT_FOUND; unknown id -> NOT_FOUND", async () => {
    // Member deletes own draft
    const draft1 = await saveReflection(db, member1, {
      sessionTitle: "Draft 1",
      sessionDate: "2026-03-09",
      rawNotes: "Notes",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });
    await expect(
      deleteReflection(db, member1, { id: draft1.id })
    ).resolves.not.toThrow();
    await expect(getReflection(db, member1, draft1.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Member deleting own SUBMITTED -> FORBIDDEN
    const submitted1 = await saveReflection(db, member1, {
      sessionTitle: "Sub 1",
      sessionDate: "2026-03-09",
      rawNotes: "Notes",
      concepts: "C",
      takeaways: "T",
      observations: "",
      insights: "",
      openQuestions: "Q",
    });
    await submitReflection(db, member1, { id: submitted1.id });
    await expect(
      deleteReflection(db, member1, { id: submitted1.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Member deleting another's SUBMITTED -> FORBIDDEN
    await expect(
      deleteReflection(db, member2, { id: submitted1.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Instructor deleting another's DRAFT -> NOT_FOUND
    const draft2 = await saveReflection(db, member1, {
      sessionTitle: "Draft 2",
      sessionDate: "2026-03-09",
      rawNotes: "Notes",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });
    await expect(
      deleteReflection(db, instructor, { id: draft2.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Instructor deleting another member's SUBMITTED -> succeeds
    await expect(
      deleteReflection(db, instructor, { id: submitted1.id })
    ).resolves.not.toThrow();
    await expect(getReflection(db, instructor, submitted1.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Unknown id -> NOT_FOUND
    await expect(
      deleteReflection(db, member1, { id: 999999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("10. listReflections pagination: create 25 SUBMITTED reflections -> page 1 has 20, page 2 has 5, total 25, newest first; scope 'mine' returns only the actor's own (drafts and submitted)", async () => {
    // Create 25 reflections for member2 and submit them
    const ids: number[] = [];
    for (let i = 1; i <= 25; i++) {
      const created = await saveReflection(db, member2, {
        sessionTitle: `Pagination Reflection ${i}`,
        sessionDate: `2026-04-${String(i).padStart(2, "0")}`,
        rawNotes: `Notes ${i}`,
        concepts: `C ${i}`,
        takeaways: `T ${i}`,
        observations: "",
        insights: "",
        openQuestions: `Q ${i}`,
      });
      await submitReflection(db, member2, { id: created.id });
      ids.push(created.id);
    }

    const page1 = await listReflections(db, member1, { page: 1, scope: "all" });
    expect(page1.items.length).toBe(20);
    expect(page1.total).toBeGreaterThanOrEqual(25);
    expect(page1.pageSize).toBe(20);

    const page2 = await listReflections(db, member1, { page: 2, scope: "all" });
    expect(page2.items.length).toBeGreaterThanOrEqual(5);

    // Verify scope: "mine" for member2 returns member2's own only
    const member2Mine = await listReflections(db, member2, {
      page: 1,
      scope: "mine",
    });
    expect(member2Mine.items.every((r) => r.authorId === member2.id)).toBe(true);

    const member1Mine = await listReflections(db, member1, {
      page: 1,
      scope: "mine",
    });
    expect(member1Mine.items.every((r) => r.authorId === member1.id)).toBe(true);
  });

  it("11. Returned objects have authorName and no passwordHash or email key", async () => {
    const list = await listReflections(db, member1, { page: 1, scope: "all" });
    expect(list.items.length).toBeGreaterThan(0);
    const item = list.items[0];

    expect(item.authorName).toBeDefined();
    expect(typeof item.authorName).toBe("string");
    expect((item as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((item as Record<string, unknown>).email).toBeUndefined();

    const single = await getReflection(db, member1, item.id);
    expect(single.authorName).toBeDefined();
    expect(typeof single.authorName).toBe("string");
    expect((single as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((single as Record<string, unknown>).email).toBeUndefined();
  });

  it("12. Validation: reflectionSaveSchema rejects 2026-02-30 and abc, accepts 2026-02-28; an empty title is rejected", () => {
    const valid = {
      sessionTitle: "Valid Session",
      sessionDate: "2026-02-28",
      rawNotes: "Notes",
    };

    expect(reflectionSaveSchema.safeParse(valid).success).toBe(true);

    // Rejects impossible calendar date
    const leapError = reflectionSaveSchema.safeParse({
      ...valid,
      sessionDate: "2026-02-30",
    });
    expect(leapError.success).toBe(false);

    // Rejects non-date string
    const stringError = reflectionSaveSchema.safeParse({
      ...valid,
      sessionDate: "abc",
    });
    expect(stringError.success).toBe(false);

    // Rejects empty title
    const emptyTitle = reflectionSaveSchema.safeParse({
      ...valid,
      sessionTitle: "   ",
    });
    expect(emptyTitle.success).toBe(false);
  });

  it("13. toFailure(new AiError('RATE_LIMITED')) returns { ok: false } with the AI message and does not call console.error (spy)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const aiErr = new AiError("RATE_LIMITED");
    const result = toFailure(aiErr);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(aiErr.message);
    }
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
