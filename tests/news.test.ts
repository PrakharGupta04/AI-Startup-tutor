import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "./test-db";
import { registerUser } from "@/lib/data/users";
import {
  saveNews,
  generateNewsSummary,
  publishNews,
  unpublishNews,
  deleteNews,
  listPublishedNews,
  listAllNews,
  getNewsForEdit,
} from "@/lib/data/news";
import { newsItems } from "@/lib/db/schema";
import { createDemoProvider } from "@/lib/ai/demo";
import { AiError } from "@/lib/ai/errors";
import {
  DEMO_PREFIX,
  type AiProvider,
  type StructuredReflection,
  type NewsSummary,
} from "@/lib/ai/types";
import { AppError } from "@/lib/errors";
import type { AuthUser } from "@/lib/permissions";
import { newsSaveSchema, parseInput } from "@/lib/validation";

describe("news data layer, validation, and permissions", () => {
  let db: Db;
  let cleanup: () => void;
  let member: AuthUser;
  let instructor: AuthUser;

  const codes = {
    joinCode: "member-join-code-123",
    instructorCode: "instructor-secret-code-456",
  };

  const demoProvider = createDemoProvider();

  class CountingFailingProvider implements AiProvider {
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
    const res = await createTestDb();
    db = res.db;
    cleanup = res.cleanup;

    member = await registerUser(
      db,
      {
        name: "Test Member",
        email: "member@example.com",
        password: "Password123!",
        code: codes.joinCode,
      },
      codes
    );

    instructor = await registerUser(
      db,
      {
        name: "Test Instructor",
        email: "instructor@example.com",
        password: "Password123!",
        code: codes.instructorCode,
      },
      codes
    );
  });

  afterAll(() => {
    cleanup();
  });

  it("1. A MEMBER calling instructor functions receives FORBIDDEN", async () => {
    await expect(
      saveNews(db, member, {
        category: "PARTNERSHIPS_ALLIANCES",
        headline: "Test Headline",
        sourceName: "TechCrunch",
        sourceUrl: "https://example.com/test",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      generateNewsSummary(db, member, demoProvider, { id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(publishNews(db, member, { id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(unpublishNews(db, member, { id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(deleteNews(db, member, { id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(listAllNews(db, member, { page: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(getNewsForEdit(db, member, 1)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("2. saveNews creates a DRAFT storing all fields; updating works; unknown id -> NOT_FOUND; schema validation rules", async () => {
    // Schema validation tests
    expect(() =>
      parseInput(newsSaveSchema, {
        category: "PARTNERSHIPS_ALLIANCES",
        headline: "Headline",
        sourceName: "Source",
        sourceUrl: "javascript:alert(1)",
      })
    ).toThrowError(AppError);

    expect(() =>
      parseInput(newsSaveSchema, {
        category: "PARTNERSHIPS_ALLIANCES",
        headline: "Headline",
        sourceName: "Source",
        sourceUrl: "ftp://x.com",
      })
    ).toThrowError(AppError);

    expect(() =>
      parseInput(newsSaveSchema, {
        category: "PARTNERSHIPS_ALLIANCES",
        headline: "Headline",
        sourceName: "Source",
        sourceUrl: "not a url",
      })
    ).toThrowError(AppError);

    const validParsed = parseInput(newsSaveSchema, {
      category: "PARTNERSHIPS_ALLIANCES",
      headline: "Headline",
      sourceName: "Source",
      sourceUrl: "https://example.com/a?b=1",
      publishedOn: "",
    });
    expect(validParsed.publishedOn).toBeNull();
    expect(validParsed.sourceUrl).toBe("https://example.com/a?b=1");

    expect(() =>
      parseInput(newsSaveSchema, {
        category: "PARTNERSHIPS_ALLIANCES",
        headline: "Headline",
        sourceName: "Source",
        sourceUrl: "https://example.com",
        publishedOn: "2026-02-31", // invalid date
      })
    ).toThrowError(AppError);

    expect(() =>
      parseInput(newsSaveSchema, {
        category: "UNKNOWN_CATEGORY",
        headline: "Headline",
        sourceName: "Source",
        sourceUrl: "https://example.com",
      })
    ).toThrowError(AppError);

    // Create DRAFT in DB
    const created = await saveNews(db, instructor, {
      category: "ACQUISITIONS",
      headline: "BigCorp acquires AI Startup",
      companies: "BigCorp, AI Startup",
      publishedOn: "2026-05-15",
      sourceName: "TechCrunch",
      sourceUrl: "https://techcrunch.com/article-1",
      sourceText: "BigCorp has announced the acquisition of AI Startup for $50M.",
      factSummary: "Acquisition announced.",
      whyItMatters: "Shows consolidation in AI.",
    });

    expect(created.id).toBeGreaterThan(0);

    const item = await getNewsForEdit(db, instructor, created.id);
    expect(item.status).toBe("DRAFT");
    expect(item.category).toBe("ACQUISITIONS");
    expect(item.headline).toBe("BigCorp acquires AI Startup");
    expect(item.companies).toBe("BigCorp, AI Startup");
    expect(item.publishedOn).toBe("2026-05-15");
    expect(item.sourceName).toBe("TechCrunch");
    expect(item.sourceUrl).toBe("https://techcrunch.com/article-1");
    expect(item.sourceText).toBe(
      "BigCorp has announced the acquisition of AI Startup for $50M."
    );
    expect(item.factSummary).toBe("Acquisition announced.");
    expect(item.whyItMatters).toBe("Shows consolidation in AI.");
    expect(item.aiAssisted).toBe(false);
    expect(item.publishedAt).toBeNull();

    // Update the item
    await saveNews(db, instructor, {
      id: created.id,
      category: "ACQUISITIONS",
      headline: "BigCorp acquires AI Startup for $55M",
      companies: "BigCorp, AI Startup",
      publishedOn: "2026-05-16",
      sourceName: "TechCrunch Updates",
      sourceUrl: "https://techcrunch.com/article-1-updated",
      sourceText: "Updated source text.",
      factSummary: "Updated summary.",
      whyItMatters: "Updated why it matters.",
    });

    const updated = await getNewsForEdit(db, instructor, created.id);
    expect(updated.headline).toBe("BigCorp acquires AI Startup for $55M");
    expect(updated.sourceName).toBe("TechCrunch Updates");
    expect(updated.publishedOn).toBe("2026-05-16");

    // Unknown ID update -> NOT_FOUND
    await expect(
      saveNews(db, instructor, {
        id: 999999,
        category: "ACQUISITIONS",
        headline: "Headline",
        sourceName: "Source",
        sourceUrl: "https://example.com",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("3. Drafts are hidden from members: listPublishedNews excludes DRAFT items", async () => {
    const draft = await saveNews(db, instructor, {
      category: "CORPORATE_VENTURE",
      headline: "Draft venture news item",
      sourceName: "VentureBeat",
      sourceUrl: "https://example.com/venture",
    });

    const publishedList = await listPublishedNews(db, member, {});
    const ids = publishedList.items.map((i) => i.id);
    expect(ids).not.toContain(draft.id);
  });

  it("4. publishNews fails with fieldErrors when summary empty; succeeds when both set; unpublishNews clears publishedAt", async () => {
    const item = await saveNews(db, instructor, {
      category: "PILOTS_JV_OPEN_INNOVATION",
      headline: "Pilot Project Launched",
      sourceName: "Reuters",
      sourceUrl: "https://reuters.com/pilot",
      factSummary: "",
      whyItMatters: "",
    });

    // publishNews fails because factSummary and whyItMatters are empty
    try {
      await publishNews(db, instructor, { id: item.id });
      expect.fail("Should have failed validation");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe("VALIDATION");
      expect(appErr.fieldErrors?.factSummary).toBe("Required to publish.");
      expect(appErr.fieldErrors?.whyItMatters).toBe("Required to publish.");
    }

    // Update with both fields
    await saveNews(db, instructor, {
      id: item.id,
      category: "PILOTS_JV_OPEN_INNOVATION",
      headline: "Pilot Project Launched",
      sourceName: "Reuters",
      sourceUrl: "https://reuters.com/pilot",
      factSummary: "A new pilot was formed between AutoCo and BatteryStartup.",
      whyItMatters: "Validates corporate appetite for solid-state batteries.",
    });

    // Publish succeeds
    await publishNews(db, instructor, { id: item.id });

    const memberList = await listPublishedNews(db, member, {});
    const published = memberList.items.find((i) => i.id === item.id);
    expect(published).toBeDefined();
    expect(published?.headline).toBe("Pilot Project Launched");
    expect(published?.publishedAt).toBeInstanceOf(Date);

    // Unpublish
    await unpublishNews(db, instructor, { id: item.id });

    const afterUnpublish = await getNewsForEdit(db, instructor, item.id);
    expect(afterUnpublish.status).toBe("DRAFT");
    expect(afterUnpublish.publishedAt).toBeNull();

    const memberListAfter = await listPublishedNews(db, member, {});
    expect(memberListAfter.items.map((i) => i.id)).not.toContain(item.id);
  });

  it("5. sourceText never appears in listPublishedNews items; getNewsForEdit returns it", async () => {
    const created = await saveNews(db, instructor, {
      category: "ACCELERATORS_INCUBATORS",
      headline: "New Accelerator Cohort Announced",
      sourceName: "Forbes",
      sourceUrl: "https://forbes.com/accelerator",
      sourceText: "CONFIDENTIAL_OR_INTERNAL_RAW_ARTICLE_TEXT",
      factSummary: "Cohort of 10 startups announced.",
      whyItMatters: "Opportunity for corporate sponsors.",
    });
    await publishNews(db, instructor, { id: created.id });

    const list = await listPublishedNews(db, member, {});
    const found = list.items.find((i) => i.id === created.id);
    expect(found).toBeDefined();
    expect(found).not.toHaveProperty("sourceText");
    expect(Object.keys(found!)).not.toContain("sourceText");

    const editView = await getNewsForEdit(db, instructor, created.id);
    expect(editView.sourceText).toBe("CONFIDENTIAL_OR_INTERNAL_RAW_ARTICLE_TEXT");
  });

  it("6. generateNewsSummary with demo provider vs failing provider vs empty sourceText", async () => {
    const failingProvider = new CountingFailingProvider();

    // With empty sourceText -> VALIDATION and provider call count is 0
    const emptyTextItem = await saveNews(db, instructor, {
      category: "ACQUISITIONS",
      headline: "Startup Acquired",
      sourceName: "Bloomberg",
      sourceUrl: "https://bloomberg.com/acquired",
      sourceText: "   ",
    });

    try {
      await generateNewsSummary(db, instructor, failingProvider, {
        id: emptyTextItem.id,
      });
      expect.fail("Should have failed on empty sourceText");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe("VALIDATION");
      expect(appErr.fieldErrors?.sourceText).toBe("Paste the article text first.");
    }
    expect(failingProvider.callCount).toBe(0);

    // Save with real text
    const withTextItem = await saveNews(db, instructor, {
      category: "ACQUISITIONS",
      headline: "FinTech Acquired by Bank",
      companies: "Bank, FinTech",
      sourceName: "WSJ",
      sourceUrl: "https://wsj.com/fintech",
      sourceText: "Bank has agreed to acquire FinTech for $100M.",
      factSummary: "Original facts",
      whyItMatters: "Original why it matters",
    });

    // With failing provider -> error propagates, DB fields and aiAssisted unchanged
    await expect(
      generateNewsSummary(db, instructor, failingProvider, {
        id: withTextItem.id,
      })
    ).rejects.toThrowError(AiError);
    expect(failingProvider.callCount).toBe(1);

    const dbItemAfterFail = await getNewsForEdit(db, instructor, withTextItem.id);
    expect(dbItemAfterFail.factSummary).toBe("Original facts");
    expect(dbItemAfterFail.whyItMatters).toBe("Original why it matters");
    expect(dbItemAfterFail.aiAssisted).toBe(false);

    // With demo provider -> success, DEMO_PREFIX in both fields, aiAssisted true, sourceText unchanged
    const summaryResult = await generateNewsSummary(
      db,
      instructor,
      demoProvider,
      { id: withTextItem.id }
    );
    expect(summaryResult.factSummary).toContain(DEMO_PREFIX);
    expect(summaryResult.whyItMatters).toContain(DEMO_PREFIX);

    const dbItemAfterSuccess = await getNewsForEdit(
      db,
      instructor,
      withTextItem.id
    );
    expect(dbItemAfterSuccess.factSummary).toContain(DEMO_PREFIX);
    expect(dbItemAfterSuccess.whyItMatters).toContain(DEMO_PREFIX);
    expect(dbItemAfterSuccess.aiAssisted).toBe(true);
    expect(dbItemAfterSuccess.sourceText).toBe(
      "Bank has agreed to acquire FinTech for $100M."
    );
  });

  it("7. Editing a PUBLISHED item and blanking factSummary -> VALIDATION; valid edit keeps it PUBLISHED", async () => {
    const item = await saveNews(db, instructor, {
      category: "CORPORATE_VENTURE",
      headline: "Venture Fund Announced",
      sourceName: "TechCrunch",
      sourceUrl: "https://techcrunch.com/fund",
      factSummary: "Fund size is $100M.",
      whyItMatters: "Increased deal flow.",
    });
    await publishNews(db, instructor, { id: item.id });

    // Try to blank factSummary on a PUBLISHED item
    try {
      await saveNews(db, instructor, {
        id: item.id,
        category: "CORPORATE_VENTURE",
        headline: "Venture Fund Announced Updated",
        sourceName: "TechCrunch",
        sourceUrl: "https://techcrunch.com/fund",
        factSummary: "   ",
        whyItMatters: "Increased deal flow.",
      });
      expect.fail("Should have failed validation when blanking factSummary on published item");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe("VALIDATION");
      expect(appErr.fieldErrors?.factSummary).toBe("Required for a published item.");
    }

    // Valid edit keeps it PUBLISHED
    await saveNews(db, instructor, {
      id: item.id,
      category: "CORPORATE_VENTURE",
      headline: "Venture Fund Announced Updated Headline",
      sourceName: "TechCrunch",
      sourceUrl: "https://techcrunch.com/fund",
      factSummary: "Fund size is updated to $120M.",
      whyItMatters: "Increased deal flow even more.",
    });

    const afterEdit = await getNewsForEdit(db, instructor, item.id);
    expect(afterEdit.headline).toBe("Venture Fund Announced Updated Headline");
    expect(afterEdit.status).toBe("PUBLISHED");
    expect(afterEdit.publishedAt).toBeInstanceOf(Date);
  });

  it("8. Category filter and pagination (14 items: page 1 has 12, page 2 has 2, total 14, newest first)", async () => {
    // Clean up existing newsItems for fresh pagination check
    await db.delete(newsItems);

    // Create 14 published items in ACCELERATORS_INCUBATORS
    for (let i = 1; i <= 14; i++) {
      const created = await saveNews(db, instructor, {
        category: "ACCELERATORS_INCUBATORS",
        headline: `Accelerator News #${i}`,
        sourceName: "Source",
        sourceUrl: `https://example.com/item-${i}`,
        factSummary: `Summary ${i}`,
        whyItMatters: `Why it matters ${i}`,
      });
      await publishNews(db, instructor, { id: created.id });
    }

    // Create 2 items in ACQUISITIONS
    for (let i = 1; i <= 2; i++) {
      const created = await saveNews(db, instructor, {
        category: "ACQUISITIONS",
        headline: `Acquisition News #${i}`,
        sourceName: "Source",
        sourceUrl: `https://example.com/acq-${i}`,
        factSummary: `Summary ${i}`,
        whyItMatters: `Why it matters ${i}`,
      });
      await publishNews(db, instructor, { id: created.id });
    }

    // Category filter: ACCELERATORS_INCUBATORS
    const catPage1 = await listPublishedNews(db, member, {
      category: "ACCELERATORS_INCUBATORS",
      page: 1,
    });
    expect(catPage1.total).toBe(14);
    expect(catPage1.pageSize).toBe(12);
    expect(catPage1.items.length).toBe(12);
    expect(
      catPage1.items.every((it) => it.category === "ACCELERATORS_INCUBATORS")
    ).toBe(true);

    const catPage2 = await listPublishedNews(db, member, {
      category: "ACCELERATORS_INCUBATORS",
      page: 2,
    });
    expect(catPage2.total).toBe(14);
    expect(catPage2.items.length).toBe(2);

    // Verify ordering: newest first
    const firstDate = catPage1.items[0]?.publishedAt?.getTime() ?? 0;
    const secondDate = catPage1.items[1]?.publishedAt?.getTime() ?? 0;
    expect(firstDate).toBeGreaterThanOrEqual(secondDate);

    // Category filter: ACQUISITIONS
    const acqList = await listPublishedNews(db, member, {
      category: "ACQUISITIONS",
      page: 1,
    });
    expect(acqList.total).toBe(2);
    expect(acqList.items.length).toBe(2);
  });

  it("9. deleteNews: instructor deletes item; unknown id -> NOT_FOUND", async () => {
    const item = await saveNews(db, instructor, {
      category: "PARTNERSHIPS_ALLIANCES",
      headline: "To Be Deleted",
      sourceName: "Source",
      sourceUrl: "https://example.com/delete",
    });

    await deleteNews(db, instructor, { id: item.id });

    await expect(getNewsForEdit(db, instructor, item.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Unknown id -> NOT_FOUND
    await expect(
      deleteNews(db, instructor, { id: 999999 })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("10. Traceability: sourceUrl and sourceName returned to member are exactly as saved", async () => {
    const created = await saveNews(db, instructor, {
      category: "PARTNERSHIPS_ALLIANCES",
      headline: "Strategic Partnership Signed",
      sourceName: "Financial Times Exact Source",
      sourceUrl: "https://www.ft.com/content/exact-slug-12345?param=value#section",
      factSummary: "Exact fact summary.",
      whyItMatters: "Exact why it matters.",
    });
    await publishNews(db, instructor, { id: created.id });

    const memberList = await listPublishedNews(db, member, {});
    const memberView = memberList.items.find((i) => i.id === created.id);
    expect(memberView).toBeDefined();
    expect(memberView?.sourceName).toBe("Financial Times Exact Source");
    expect(memberView?.sourceUrl).toBe(
      "https://www.ft.com/content/exact-slug-12345?param=value#section"
    );
  });

  it("11. listAllNews shows drafts and published with status and createdByName; no email or passwordHash keys", async () => {
    const draft = await saveNews(db, instructor, {
      category: "ACQUISITIONS",
      headline: "Draft in Admin List",
      sourceName: "Source",
      sourceUrl: "https://example.com/draft-admin",
    });

    const adminList = await listAllNews(db, instructor, { page: 1 });
    expect(adminList.total).toBeGreaterThan(0);
    expect(adminList.pageSize).toBe(20);

    const draftInList = adminList.items.find((i) => i.id === draft.id);
    expect(draftInList).toBeDefined();
    expect(draftInList?.status).toBe("DRAFT");
    expect(draftInList?.createdByName).toBe(instructor.name);

    for (const item of adminList.items) {
      expect(item).not.toHaveProperty("email");
      expect(item).not.toHaveProperty("passwordHash");
      expect(Object.keys(item)).not.toContain("email");
      expect(Object.keys(item)).not.toContain("passwordHash");
    }
  });
});
