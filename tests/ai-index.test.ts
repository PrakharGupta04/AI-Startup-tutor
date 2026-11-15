import { describe, it, expect, beforeAll } from "vitest";
import {
  resolveAiProvider,
  resolveAiStatus,
  getAiProvider,
  getAiStatus,
  type AiEnv,
} from "@/lib/ai";
import { AiError } from "@/lib/ai/errors";
import { DEMO_PREFIX } from "@/lib/ai/types";

describe("AI index - provider resolution and status", () => {
  beforeAll(() => {
    // Ensure base env variables exist so getEnv() succeeds when testing memoization
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || "file:./data/app.db";
    process.env.AUTH_SECRET =
      process.env.AUTH_SECRET ||
      "test-auth-secret-key-at-least-32-chars-long";
    process.env.GROUP_JOIN_CODE =
      process.env.GROUP_JOIN_CODE || "test-join-123";
    process.env.INSTRUCTOR_CODE =
      process.env.INSTRUCTOR_CODE || "test-instr-456";
    process.env.AI_PROVIDER = process.env.AI_PROVIDER || "demo";
  });

  describe("resolveAiProvider", () => {
    it("1. resolves demo provider when AI_PROVIDER is demo", async () => {
      const env: AiEnv = {
        AI_PROVIDER: "demo",
        GEMINI_API_KEY: undefined,
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const provider = resolveAiProvider(env);
      expect(provider.name).toBe("demo");
      expect(provider.model).toBe("demo");

      const response = await provider.tutorAnswer({ prompt: "Hello" });
      expect(response).toContain(DEMO_PREFIX);
    });

    it("2. resolves gemini provider when AI_PROVIDER is gemini with a valid key without making network calls", () => {
      const env: AiEnv = {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "fake-key-for-test",
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const provider = resolveAiProvider(env);
      expect(provider.name).toBe("gemini");
      expect(provider.model).toBe("gemini-3.6-flash");
    });

    it("3. resolves unconfigured provider when AI_PROVIDER is gemini without an API key", async () => {
      const envWithoutKey: AiEnv = {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: undefined,
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const provider = resolveAiProvider(envWithoutKey);
      expect(provider.name).toBe("gemini");
      expect(provider.model).toBe("none");

      await expect(
        provider.tutorAnswer({ prompt: "Hello" })
      ).rejects.toThrow(AiError);
      await expect(
        provider.tutorAnswer({ prompt: "Hello" })
      ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });

      await expect(
        provider.structureReflection({
          sessionTitle: "Session",
          rawNotes: "Notes",
        })
      ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });

      await expect(
        provider.summarizeNews({
          headline: "Headline",
          companies: "Corp",
          sourceName: "Source",
          sourceText: "Text",
        })
      ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    });

    it("4. resolves unconfigured provider when GEMINI_API_KEY is empty string or whitespace", async () => {
      const envEmptyKey: AiEnv = {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "   ",
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const provider = resolveAiProvider(envEmptyKey);
      expect(provider.name).toBe("gemini");
      expect(provider.model).toBe("none");

      await expect(
        provider.tutorAnswer({ prompt: "Hello" })
      ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    });
  });

  describe("resolveAiStatus", () => {
    it("1. returns configured status for demo provider", () => {
      const env: AiEnv = {
        AI_PROVIDER: "demo",
        GEMINI_API_KEY: undefined,
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const status = resolveAiStatus(env);
      expect(status).toEqual({
        provider: "demo",
        configured: true,
        model: "demo",
      });
    });

    it("2. returns configured status for gemini provider with key", () => {
      const env: AiEnv = {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "fake-key-for-test",
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const status = resolveAiStatus(env);
      expect(status).toEqual({
        provider: "gemini",
        configured: true,
        model: "gemini-3.6-flash",
      });
    });

    it("3. returns unconfigured status for gemini provider without key", () => {
      const env: AiEnv = {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: undefined,
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const status = resolveAiStatus(env);
      expect(status).toEqual({
        provider: "gemini",
        configured: false,
        model: "gemini-3.6-flash",
      });
    });

    it("4. returns unconfigured status when GEMINI_API_KEY is whitespace", () => {
      const env: AiEnv = {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "   ",
        GEMINI_MODEL: "gemini-3.6-flash",
      };

      const status = resolveAiStatus(env);
      expect(status).toEqual({
        provider: "gemini",
        configured: false,
        model: "gemini-3.6-flash",
      });
    });
  });

  describe("getAiProvider and getAiStatus memoization", () => {
    it("memoizes getAiProvider across multiple invocations", () => {
      const provider1 = getAiProvider();
      const provider2 = getAiProvider();
      expect(provider1).toBe(provider2);
    });

    it("memoizes getAiStatus across multiple invocations", () => {
      const status1 = getAiStatus();
      const status2 = getAiStatus();
      expect(status1).toBe(status2);
    });
  });
});
