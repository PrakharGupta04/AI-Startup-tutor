import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@/lib/db/client";
import { createTestDb } from "./test-db";
import { registerUser } from "@/lib/data/users";
import { saveReflection, submitReflection } from "@/lib/data/reflections";
import { saveNews, publishNews } from "@/lib/data/news";
import { askTutor } from "@/lib/data/tutor";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { createDemoProvider } from "@/lib/ai/demo";
import type { AuthUser } from "@/lib/permissions";

describe("dashboard data layer and summary", () => {
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

  beforeAll(async () => {
    const res = await createTestDb();
    db = res.db;
    cleanup = res.cleanup;

    member1 = await registerUser(
      db,
      {
        name: "Alice Member",
        email: "alice@example.com",
        password: "Password123!",
        code: codes.joinCode,
      },
      codes
    );

    member2 = await registerUser(
      db,
      {
        name: "Bob Member",
        email: "bob@example.com",
        password: "Password123!",
        code: codes.joinCode,
      },
      codes
    );

    instructor = await registerUser(
      db,
      {
        name: "Carol Instructor",
        email: "carol@example.com",
        password: "Password123!",
        code: codes.instructorCode,
      },
      codes
    );
  });

  afterAll(() => {
    cleanup();
  });

  it("1. Empty database: all lists are empty, myDraftCount is 0, instructor newsDraftCount is 0, member newsDraftCount is null", async () => {
    const memberSummary = await getDashboardSummary(db, member1);
    expect(memberSummary.recentReflections).toEqual([]);
    expect(memberSummary.latestNews).toEqual([]);
    expect(memberSummary.recentInteractions).toEqual([]);
    expect(memberSummary.myDraftCount).toBe(0);
    expect(memberSummary.newsDraftCount).toBeNull();

    const instructorSummary = await getDashboardSummary(db, instructor);
    expect(instructorSummary.recentReflections).toEqual([]);
    expect(instructorSummary.latestNews).toEqual([]);
    expect(instructorSummary.recentInteractions).toEqual([]);
    expect(instructorSummary.myDraftCount).toBe(0);
    expect(instructorSummary.newsDraftCount).toBe(0);
  });

  it("2. 7 submitted reflections -> recentReflections has exactly the 5 newest, newest first; another user's DRAFT never appears; actor's draft counted in myDraftCount but not listed", async () => {
    const submittedIds: number[] = [];

    // Create and submit 7 reflections with a time gap so submittedAt is strictly ordered
    for (let i = 1; i <= 7; i++) {
      const saved = await saveReflection(db, member1, {
        sessionTitle: `Reflection ${i}`,
        sessionDate: `2026-05-${i < 10 ? `0${i}` : i}`,
        rawNotes: `Notes ${i}`,
        concepts: `Concepts ${i}`,
        takeaways: `Takeaways ${i}`,
        observations: `Observations ${i}`,
        insights: `Insights ${i}`,
        openQuestions: `Questions ${i}`,
      });
      await submitReflection(db, member1, { id: saved.id });
      submittedIds.push(saved.id);
    }

    // Create a draft for member1
    await saveReflection(db, member1, {
      sessionTitle: "Member1 Draft Reflection",
      sessionDate: "2026-05-20",
      rawNotes: "Draft notes",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    // Create a draft for member2
    await saveReflection(db, member2, {
      sessionTitle: "Member2 Private Draft",
      sessionDate: "2026-05-21",
      rawNotes: "Confidential draft notes",
      concepts: "",
      takeaways: "",
      observations: "",
      insights: "",
      openQuestions: "",
    });

    const summary = await getDashboardSummary(db, member1);

    // Exactly 5 newest reflections returned
    expect(summary.recentReflections).toHaveLength(5);
    expect(summary.recentReflections[0]?.id).toBe(submittedIds[6]); // Reflection 7
    expect(summary.recentReflections[1]?.id).toBe(submittedIds[5]); // Reflection 6
    expect(summary.recentReflections[2]?.id).toBe(submittedIds[4]); // Reflection 5
    expect(summary.recentReflections[3]?.id).toBe(submittedIds[3]); // Reflection 4
    expect(summary.recentReflections[4]?.id).toBe(submittedIds[2]); // Reflection 3

    // Verify ordering: newest first by submittedAt
    for (let i = 0; i < summary.recentReflections.length - 1; i++) {
      const current = summary.recentReflections[i]?.submittedAt?.getTime() ?? 0;
      const next = summary.recentReflections[i + 1]?.submittedAt?.getTime() ?? 0;
      expect(current).toBeGreaterThanOrEqual(next);
    }

    // Drafts never appear in recentReflections
    const reflectionTitles = summary.recentReflections.map((r) => r.sessionTitle);
    expect(reflectionTitles).not.toContain("Member1 Draft Reflection");
    expect(reflectionTitles).not.toContain("Member2 Private Draft");

    // myDraftCount is 1 for member1
    expect(summary.myDraftCount).toBe(1);

    // myDraftCount is 1 for member2
    const member2Summary = await getDashboardSummary(db, member2);
    expect(member2Summary.myDraftCount).toBe(1);
    const member2Titles = member2Summary.recentReflections.map((r) => r.sessionTitle);
    expect(member2Titles).not.toContain("Member2 Private Draft");
  });

  it("3. News: DRAFT items never appear in latestNews; with 7 published items only 5 newest appear; instructor gets newsDraftCount 2", async () => {
    const publishedIds: number[] = [];

    // Create and publish 7 news items
    for (let i = 1; i <= 7; i++) {
      const saved = await saveNews(db, instructor, {
        category: "PARTNERSHIPS_ALLIANCES",
        headline: `News Item #${i}`,
        sourceName: `Source ${i}`,
        sourceUrl: `https://example.com/news-${i}`,
        factSummary: `Fact summary ${i}`,
        whyItMatters: `Why it matters ${i}`,
      });
      await publishNews(db, instructor, { id: saved.id });
      publishedIds.push(saved.id);
    }

    // Create 2 draft news items
    await saveNews(db, instructor, {
      category: "ACQUISITIONS",
      headline: "Draft News Alpha",
      sourceName: "Source Alpha",
      sourceUrl: "https://example.com/alpha",
    });

    await saveNews(db, instructor, {
      category: "CORPORATE_VENTURE",
      headline: "Draft News Beta",
      sourceName: "Source Beta",
      sourceUrl: "https://example.com/beta",
    });

    // Member view
    const memberSummary = await getDashboardSummary(db, member1);
    expect(memberSummary.latestNews).toHaveLength(5);
    expect(memberSummary.latestNews[0]?.id).toBe(publishedIds[6]); // News 7
    expect(memberSummary.latestNews[1]?.id).toBe(publishedIds[5]); // News 6

    const newsHeadlines = memberSummary.latestNews.map((n) => n.headline);
    expect(newsHeadlines).not.toContain("Draft News Alpha");
    expect(newsHeadlines).not.toContain("Draft News Beta");
    expect(memberSummary.newsDraftCount).toBeNull();

    // Instructor view
    const instructorSummary = await getDashboardSummary(db, instructor);
    expect(instructorSummary.latestNews).toHaveLength(5);
    expect(instructorSummary.newsDraftCount).toBe(2);
  });

  it("4. Interactions: with 7 interactions only the 5 newest appear, newest first", async () => {
    const interactionIds: number[] = [];

    for (let i = 1; i <= 7; i++) {
      const interaction = await askTutor(db, member1, demoProvider, {
        prompt: `Question prompt ${i}?`,
      });
      interactionIds.push(interaction.id);
    }

    const summary = await getDashboardSummary(db, member1);
    expect(summary.recentInteractions).toHaveLength(5);
    expect(summary.recentInteractions[0]?.id).toBe(interactionIds[6]); // Question 7
    expect(summary.recentInteractions[1]?.id).toBe(interactionIds[5]); // Question 6
    expect(summary.recentInteractions[2]?.id).toBe(interactionIds[4]); // Question 5
    expect(summary.recentInteractions[3]?.id).toBe(interactionIds[3]); // Question 4
    expect(summary.recentInteractions[4]?.id).toBe(interactionIds[2]); // Question 3

    // Verify newest first
    for (let i = 0; i < summary.recentInteractions.length - 1; i++) {
      const current = summary.recentInteractions[i]?.createdAt.getTime() ?? 0;
      const next = summary.recentInteractions[i + 1]?.createdAt.getTime() ?? 0;
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it("5. No returned object contains an email or passwordHash key; latestNews items contain no sourceText key", async () => {
    const summary = await getDashboardSummary(db, member1);

    for (const ref of summary.recentReflections) {
      expect(ref).not.toHaveProperty("email");
      expect(ref).not.toHaveProperty("passwordHash");
      expect(Object.keys(ref)).not.toContain("email");
      expect(Object.keys(ref)).not.toContain("passwordHash");
    }

    for (const news of summary.latestNews) {
      expect(news).not.toHaveProperty("email");
      expect(news).not.toHaveProperty("passwordHash");
      expect(news).not.toHaveProperty("sourceText");
      expect(Object.keys(news)).not.toContain("email");
      expect(Object.keys(news)).not.toContain("passwordHash");
      expect(Object.keys(news)).not.toContain("sourceText");
    }

    for (const item of summary.recentInteractions) {
      expect(item).not.toHaveProperty("email");
      expect(item).not.toHaveProperty("passwordHash");
      expect(Object.keys(item)).not.toContain("email");
      expect(Object.keys(item)).not.toContain("passwordHash");
    }
  });
});
