import { describe, it, expect } from "vitest";
import { createDemoProvider } from "@/lib/ai/demo";
import { createUnconfiguredProvider } from "@/lib/ai/unconfigured";
import { DEMO_PREFIX, AI_INPUT_LIMITS } from "@/lib/ai/types";
import { AiError } from "@/lib/ai/errors";

describe("Demo Provider", () => {
  const provider = createDemoProvider();

  it("has name 'demo' and model 'demo'", () => {
    expect(provider.name).toBe("demo");
    expect(provider.model).toBe("demo");
  });

  describe("tutorAnswer", () => {
    it("returns output containing DEMO_PREFIX for valid input", async () => {
      const response = await provider.tutorAnswer({ prompt: "What is corporate venturing?" });
      expect(response).toContain(DEMO_PREFIX);
      expect(response.startsWith(DEMO_PREFIX)).toBe(true);
    });

    it("throws INVALID_INPUT for empty or whitespace-only prompt", async () => {
      await expect(provider.tutorAnswer({ prompt: "" })).rejects.toThrow(AiError);
      await expect(provider.tutorAnswer({ prompt: "   \n\t " })).rejects.toThrow(
        expect.objectContaining({ code: "INVALID_INPUT" })
      );
    });

    it("throws INVALID_INPUT for prompt exceeding limit", async () => {
      const longPrompt = "a".repeat(AI_INPUT_LIMITS.tutorPrompt + 1);
      await expect(provider.tutorAnswer({ prompt: longPrompt })).rejects.toThrow(
        expect.objectContaining({ code: "INVALID_INPUT" })
      );
    });
  });

  describe("structureReflection", () => {
    it("returns all 5 fields containing DEMO_PREFIX for valid inputs", async () => {
      const reflection = await provider.structureReflection({
        sessionTitle: "Session 1: Corporate Incubators",
        rawNotes: "Notes from the incubator session.",
      });

      expect(reflection.concepts).toContain(DEMO_PREFIX);
      expect(reflection.takeaways).toContain(DEMO_PREFIX);
      expect(reflection.observations).toContain(DEMO_PREFIX);
      expect(reflection.insights).toContain(DEMO_PREFIX);
      expect(reflection.openQuestions).toContain(DEMO_PREFIX);
    });

    it("throws INVALID_INPUT when sessionTitle or rawNotes is empty", async () => {
      await expect(
        provider.structureReflection({ sessionTitle: "", rawNotes: "Notes" })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));

      await expect(
        provider.structureReflection({ sessionTitle: "Title", rawNotes: "   " })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    });

    it("throws INVALID_INPUT when sessionTitle or rawNotes exceeds limits", async () => {
      const longTitle = "a".repeat(AI_INPUT_LIMITS.sessionTitle + 1);
      await expect(
        provider.structureReflection({ sessionTitle: longTitle, rawNotes: "Notes" })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));

      const longNotes = "a".repeat(AI_INPUT_LIMITS.rawNotes + 1);
      await expect(
        provider.structureReflection({ sessionTitle: "Title", rawNotes: longNotes })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    });
  });

  describe("summarizeNews", () => {
    it("returns factSummary and whyItMatters containing DEMO_PREFIX", async () => {
      const summary = await provider.summarizeNews({
        headline: "Tech Giant Invests in Green Tech Startup",
        companies: "Tech Giant, GreenTech",
        sourceName: "Tech News Daily",
        sourceText: "Tech Giant has announced a minority investment in GreenTech...",
      });

      expect(summary.factSummary).toContain(DEMO_PREFIX);
      expect(summary.whyItMatters).toContain(DEMO_PREFIX);
    });

    it("allows optional companies and sourceName to be empty", async () => {
      const summary = await provider.summarizeNews({
        headline: "Startup Acquisition Announced",
        companies: "",
        sourceName: "   ",
        sourceText: "A startup was acquired for an undisclosed sum.",
      });

      expect(summary.factSummary).toContain(DEMO_PREFIX);
      expect(summary.whyItMatters).toContain(DEMO_PREFIX);
    });

    it("throws INVALID_INPUT when headline or sourceText is empty", async () => {
      await expect(
        provider.summarizeNews({
          headline: "",
          companies: "",
          sourceName: "",
          sourceText: "Valid source text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));

      await expect(
        provider.summarizeNews({
          headline: "Valid headline",
          companies: "",
          sourceName: "",
          sourceText: "   ",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    });

    it("throws INVALID_INPUT when fields exceed limits", async () => {
      const longHeadline = "a".repeat(AI_INPUT_LIMITS.headline + 1);
      await expect(
        provider.summarizeNews({
          headline: longHeadline,
          companies: "",
          sourceName: "",
          sourceText: "Valid text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));

      const longCompanies = "a".repeat(AI_INPUT_LIMITS.companies + 1);
      await expect(
        provider.summarizeNews({
          headline: "Headline",
          companies: longCompanies,
          sourceName: "",
          sourceText: "Valid text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));

      const longSourceText = "a".repeat(AI_INPUT_LIMITS.sourceText + 1);
      await expect(
        provider.summarizeNews({
          headline: "Headline",
          companies: "",
          sourceName: "",
          sourceText: longSourceText,
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    });
  });
});

describe("Unconfigured Provider", () => {
  const provider = createUnconfiguredProvider();

  it("has name 'gemini' and model 'none'", () => {
    expect(provider.name).toBe("gemini");
    expect(provider.model).toBe("none");
  });

  it("throws NOT_CONFIGURED on tutorAnswer", async () => {
    await expect(provider.tutorAnswer({ prompt: "Hello" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_CONFIGURED" })
    );
  });

  it("throws NOT_CONFIGURED on structureReflection", async () => {
    await expect(
      provider.structureReflection({ sessionTitle: "Title", rawNotes: "Notes" })
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_CONFIGURED" }));
  });

  it("throws NOT_CONFIGURED on summarizeNews", async () => {
    await expect(
      provider.summarizeNews({
        headline: "Headline",
        companies: "Companies",
        sourceName: "Source",
        sourceText: "Source text",
      })
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_CONFIGURED" }));
  });
});
