import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGeminiProvider } from "@/lib/ai/gemini";
import {
  TUTOR_SYSTEM_PROMPT,
  REFLECTION_SYSTEM_PROMPT,
  NEWS_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { AI_INPUT_LIMITS } from "@/lib/ai/types";
import type {
  GeminiClientLike,
  GeminiResponseLike,
} from "@/lib/ai/gemini-core";
import type { GenerateContentConfig } from "@google/genai";

function createFakeClient(
  handler: (params: {
    model: string;
    contents: string;
    config?: GenerateContentConfig;
  }) => Promise<GeminiResponseLike>
): {
  client: GeminiClientLike;
  calls: Array<{ model: string; contents: string; config?: GenerateContentConfig }>;
} {
  const calls: Array<{
    model: string;
    contents: string;
    config?: GenerateContentConfig;
  }> = [];

  const client: GeminiClientLike = {
    models: {
      async generateContent(params) {
        calls.push(params);
        return handler(params);
      },
    },
  };

  return { client, calls };
}

describe("gemini provider", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dummyApiKey = "fake-api-key";
  const dummyModel = "gemini-3.6-flash";

  describe("metadata", () => {
    it("has name 'gemini' and the provided model", () => {
      const { client } = createFakeClient(async () => ({ text: "ok" }));
      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      expect(provider.name).toBe("gemini");
      expect(provider.model).toBe(dummyModel);
    });
  });

  describe("tutorAnswer", () => {
    it("returns fake text and verifies recorded contents and systemInstruction", async () => {
      const { client, calls } = createFakeClient(async () => ({
        text: "Here is the tutor explanation.",
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      const response = await provider.tutorAnswer({
        prompt: "  Explain corporate accelerators.  \n",
      });

      expect(response).toBe("Here is the tutor explanation.");
      expect(calls).toHaveLength(1);
      expect(calls[0].model).toBe(dummyModel);
      expect(calls[0].contents).toBe("Explain corporate accelerators.");
      expect(calls[0].config?.systemInstruction).toBe(TUTOR_SYSTEM_PROMPT);
    });
  });

  describe("structureReflection", () => {
    it("returns trimmed fields from valid JSON and verifies schema has no $schema key and has concepts property", async () => {
      const validJson = JSON.stringify({
        concepts: "  - Concept 1  ",
        takeaways: "  - Takeaway 1  ",
        observations: "  - Obs 1  ",
        insights: "  - Insight 1  ",
        openQuestions: "  - Question 1  ",
      });

      const { client, calls } = createFakeClient(async () => ({
        text: validJson,
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      const result = await provider.structureReflection({
        sessionTitle: "Session 2",
        rawNotes: "Some raw notes here",
      });

      expect(result).toEqual({
        concepts: "- Concept 1",
        takeaways: "- Takeaway 1",
        observations: "- Obs 1",
        insights: "- Insight 1",
        openQuestions: "- Question 1",
      });

      expect(calls).toHaveLength(1);
      expect(calls[0].config?.systemInstruction).toBe(REFLECTION_SYSTEM_PROMPT);

      const jsonSchema = calls[0].config?.responseJsonSchema as Record<string, unknown>;
      expect(jsonSchema).toBeDefined();
      expect("$schema" in jsonSchema).toBe(false);
      const properties = jsonSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty("concepts");
    });

    it("accepts fenced JSON (```json ... ```)", async () => {
      const fenced =
        "```json\n" +
        JSON.stringify({
          concepts: "- Concept",
          takeaways: "- Takeaway",
          observations: "- Observation",
          insights: "- Insight",
          openQuestions: "- Question",
        }) +
        "\n```";

      const { client } = createFakeClient(async () => ({
        text: fenced,
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      const result = await provider.structureReflection({
        sessionTitle: "Title",
        rawNotes: "Notes",
      });

      expect(result.concepts).toBe("- Concept");
      expect(result.takeaways).toBe("- Takeaway");
    });

    it("throws MALFORMED on unparseable JSON", async () => {
      const { client } = createFakeClient(async () => ({
        text: "This is plain text, not JSON at all.",
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      await expect(
        provider.structureReflection({
          sessionTitle: "Title",
          rawNotes: "Notes",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "MALFORMED" }));
    });

    it("throws MALFORMED when a required key is missing", async () => {
      const incompleteJson = JSON.stringify({
        concepts: "- Concept",
        takeaways: "- Takeaway",
        observations: "- Observation",
        insights: "- Insight",
        // missing openQuestions
      });

      const { client } = createFakeClient(async () => ({
        text: incompleteJson,
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      await expect(
        provider.structureReflection({
          sessionTitle: "Title",
          rawNotes: "Notes",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "MALFORMED" }));
    });

    it("throws EMPTY if all five fields are empty", async () => {
      const allEmptyJson = JSON.stringify({
        concepts: "   ",
        takeaways: "",
        observations: "\n",
        insights: "",
        openQuestions: "   ",
      });

      const { client } = createFakeClient(async () => ({
        text: allEmptyJson,
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      await expect(
        provider.structureReflection({
          sessionTitle: "Title",
          rawNotes: "Notes",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "EMPTY" }));
    });
  });

  describe("summarizeNews", () => {
    it("returns trimmed fields on valid JSON and accepts empty companies", async () => {
      const validNews = JSON.stringify({
        factSummary: "  Fact summary text.  ",
        whyItMatters: "  Why it matters interpretation.  ",
      });

      const { client, calls } = createFakeClient(async () => ({
        text: validNews,
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      const result = await provider.summarizeNews({
        headline: "Tech Partnership Announced",
        companies: "",
        sourceName: "News Wire",
        sourceText: "Article text here.",
      });

      expect(result).toEqual({
        factSummary: "Fact summary text.",
        whyItMatters: "Why it matters interpretation.",
      });

      expect(calls).toHaveLength(1);
      expect(calls[0].config?.systemInstruction).toBe(NEWS_SYSTEM_PROMPT);
    });

    it("throws MALFORMED on malformed JSON", async () => {
      const { client } = createFakeClient(async () => ({
        text: "{ invalid json here }",
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      await expect(
        provider.summarizeNews({
          headline: "Headline",
          companies: "Comp",
          sourceName: "Source",
          sourceText: "Source text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "MALFORMED" }));
    });

    it("throws EMPTY if both fields are empty", async () => {
      const bothEmpty = JSON.stringify({
        factSummary: "   ",
        whyItMatters: "",
      });

      const { client } = createFakeClient(async () => ({
        text: bothEmpty,
      }));

      const provider = createGeminiProvider({
        apiKey: dummyApiKey,
        model: dummyModel,
        client,
      });

      await expect(
        provider.summarizeNews({
          headline: "Headline",
          companies: "Comp",
          sourceName: "Source",
          sourceText: "Source text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "EMPTY" }));
    });
  });

  describe("input validation before client calls", () => {
    it("rejects empty tutor prompt with zero client calls", async () => {
      const { client, calls } = createFakeClient(async () => ({ text: "ok" }));
      const provider = createGeminiProvider({ apiKey: dummyApiKey, model: dummyModel, client });

      await expect(provider.tutorAnswer({ prompt: "" })).rejects.toThrow(
        expect.objectContaining({ code: "INVALID_INPUT" })
      );
      expect(calls).toHaveLength(0);
    });

    it("rejects over-limit tutor prompt with zero client calls", async () => {
      const { client, calls } = createFakeClient(async () => ({ text: "ok" }));
      const provider = createGeminiProvider({ apiKey: dummyApiKey, model: dummyModel, client });

      const overLimit = "a".repeat(AI_INPUT_LIMITS.tutorPrompt + 1);
      await expect(provider.tutorAnswer({ prompt: overLimit })).rejects.toThrow(
        expect.objectContaining({ code: "INVALID_INPUT" })
      );
      expect(calls).toHaveLength(0);
    });

    it("rejects empty reflection inputs with zero client calls", async () => {
      const { client, calls } = createFakeClient(async () => ({ text: "ok" }));
      const provider = createGeminiProvider({ apiKey: dummyApiKey, model: dummyModel, client });

      await expect(
        provider.structureReflection({ sessionTitle: "   ", rawNotes: "Notes" })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
      expect(calls).toHaveLength(0);

      await expect(
        provider.structureReflection({ sessionTitle: "Title", rawNotes: "" })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
      expect(calls).toHaveLength(0);
    });

    it("rejects over-limit reflection inputs with zero client calls", async () => {
      const { client, calls } = createFakeClient(async () => ({ text: "ok" }));
      const provider = createGeminiProvider({ apiKey: dummyApiKey, model: dummyModel, client });

      const overLimitNotes = "a".repeat(AI_INPUT_LIMITS.rawNotes + 1);
      await expect(
        provider.structureReflection({ sessionTitle: "Title", rawNotes: overLimitNotes })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
      expect(calls).toHaveLength(0);
    });

    it("rejects empty and over-limit news inputs with zero client calls", async () => {
      const { client, calls } = createFakeClient(async () => ({ text: "ok" }));
      const provider = createGeminiProvider({ apiKey: dummyApiKey, model: dummyModel, client });

      await expect(
        provider.summarizeNews({
          headline: "",
          companies: "",
          sourceName: "",
          sourceText: "Valid text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
      expect(calls).toHaveLength(0);

      const overLimitHeadline = "a".repeat(AI_INPUT_LIMITS.headline + 1);
      await expect(
        provider.summarizeNews({
          headline: overLimitHeadline,
          companies: "",
          sourceName: "",
          sourceText: "Valid text",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
      expect(calls).toHaveLength(0);
    });
  });

  describe("error propagation", () => {
    it("propagates AiError from generate (e.g., status 429 RATE_LIMITED)", async () => {
      const { client } = createFakeClient(async () => {
        throw Object.assign(new Error("Rate limit exceeded"), { status: 429 });
      });

      const provider = createGeminiProvider({ apiKey: dummyApiKey, model: dummyModel, client });

      await expect(provider.tutorAnswer({ prompt: "Question" })).rejects.toThrow(
        expect.objectContaining({ code: "RATE_LIMITED" })
      );
    });
  });
});
