import { describe, it, expect } from "vitest";
import {
  TUTOR_SYSTEM_PROMPT,
  REFLECTION_SYSTEM_PROMPT,
  NEWS_SYSTEM_PROMPT,
  buildTutorContents,
  buildReflectionContents,
  buildNewsContents,
} from "@/lib/ai/prompts";

describe("AI System Prompts", () => {
  it("contains expected phrases in TUTOR_SYSTEM_PROMPT", () => {
    expect(TUTOR_SYSTEM_PROMPT).toContain("verify independently");
    expect(TUTOR_SYSTEM_PROMPT).toContain("Corporate Startup Tutor");
    expect(TUTOR_SYSTEM_PROMPT).toContain("**Short answer**");
    expect(TUTOR_SYSTEM_PROMPT).toContain("**Explanation**");
    expect(TUTOR_SYSTEM_PROMPT).toContain("**Examples**");
    expect(TUTOR_SYSTEM_PROMPT).toContain("**Practical implications**");
    expect(TUTOR_SYSTEM_PROMPT).toContain("**Uncertainty and what to verify**");
  });

  it("contains expected phrases in REFLECTION_SYSTEM_PROMPT", () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain("ONLY information");
    expect(REFLECTION_SYSTEM_PROMPT).toContain("openQuestions");
    expect(REFLECTION_SYSTEM_PROMPT).toContain(
      "concepts, takeaways, observations, insights, openQuestions"
    );
  });

  it("contains expected phrases in NEWS_SYSTEM_PROMPT", () => {
    expect(NEWS_SYSTEM_PROMPT).toContain("factSummary");
    expect(NEWS_SYSTEM_PROMPT).toContain("whyItMatters");
    expect(NEWS_SYSTEM_PROMPT).toContain("ONLY information present in the source text");
  });
});

describe("Content Builders", () => {
  it("buildTutorContents trims input and returns exact string", () => {
    const raw = "   What are corporate venture capital syndicates?   \n\n";
    const result = buildTutorContents(raw);
    expect(result).toBe("What are corporate venture capital syndicates?");
  });

  it("buildReflectionContents preserves exact structure and delimiters while trimming inputs", () => {
    const sessionTitle = "   Session 4: Pilot Projects   ";
    const rawNotes = "  - Covered milestone-based pilots\n- Avoided IP leakage  \n";

    const result = buildReflectionContents({ sessionTitle, rawNotes });
    const expected =
      "Class session: Session 4: Pilot Projects\n\n<<<NOTES\n- Covered milestone-based pilots\n- Avoided IP leakage\nNOTES>>>";

    expect(result).toBe(expected);
  });

  it("buildNewsContents preserves exact structure and delimiters while trimming inputs", () => {
    const input = {
      headline: "  Acme Corp Partners with AI Startup Beta  ",
      companies: "  Acme Corp, Beta Inc.  ",
      sourceName: "  Tech Dispatch  ",
      sourceText: "  Acme Corp today announced a commercial pilot agreement with Beta Inc.  ",
    };

    const result = buildNewsContents(input);
    const expected =
      "Headline: Acme Corp Partners with AI Startup Beta\n" +
      "Companies: Acme Corp, Beta Inc.\n" +
      "Source: Tech Dispatch\n\n" +
      "<<<SOURCE_TEXT\n" +
      "Acme Corp today announced a commercial pilot agreement with Beta Inc.\n" +
      "SOURCE_TEXT>>>";

    expect(result).toBe(expected);
  });
});
