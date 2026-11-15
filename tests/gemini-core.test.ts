import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generate,
  mapGeminiError,
  type GeminiClientLike,
  type GeminiResponseLike,
  AI_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/gemini-core";
import { AiError } from "@/lib/ai/errors";
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

describe("gemini-core", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate", () => {
    it("returns trimmed text on success and sends correct config without temperature", async () => {
      const { client, calls } = createFakeClient(async () => ({
        text: "  Generated response text.  \n",
      }));

      const result = await generate(client, {
        model: "gemini-3.6-flash",
        systemInstruction: "You are a helpful tutor.",
        contents: "Hello world",
      });

      expect(result).toBe("Generated response text.");
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.model).toBe("gemini-3.6-flash");
      expect(call.contents).toBe("Hello world");

      const config = call.config;
      expect(config).toBeDefined();
      expect(config?.systemInstruction).toBe("You are a helpful tutor.");
      expect(config?.maxOutputTokens).toBe(AI_MAX_OUTPUT_TOKENS);
      expect(config?.abortSignal).toBeInstanceOf(AbortSignal);
      expect(config?.thinkingConfig).toBeDefined();
      expect("temperature" in (config ?? {})).toBe(false);
      expect(config?.responseMimeType).toBeUndefined();
      expect(config?.responseJsonSchema).toBeUndefined();
    });

    it("includes responseMimeType and responseJsonSchema when jsonSchema is provided", async () => {
      const schema = { type: "object", properties: { key: { type: "string" } } };
      const { client, calls } = createFakeClient(async () => ({
        text: '{"key": "value"}',
      }));

      const result = await generate(client, {
        model: "gemini-3.6-flash",
        systemInstruction: "Return JSON.",
        contents: "Input data",
        jsonSchema: schema,
      });

      expect(result).toBe('{"key": "value"}');
      expect(calls[0].config?.responseMimeType).toBe("application/json");
      expect(calls[0].config?.responseJsonSchema).toEqual(schema);
    });

    it("throws BLOCKED if promptFeedback.blockReason is present", async () => {
      const { client } = createFakeClient(async () => ({
        promptFeedback: { blockReason: "SAFETY" },
        text: "Some text",
      }));

      await expect(
        generate(client, {
          model: "gemini-3.6-flash",
          systemInstruction: "System",
          contents: "Prompt",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "BLOCKED" }));
    });

    it("throws EMPTY if response text is missing or whitespace only", async () => {
      const { client: clientEmpty } = createFakeClient(async () => ({
        text: "",
      }));
      await expect(
        generate(clientEmpty, {
          model: "gemini-3.6-flash",
          systemInstruction: "System",
          contents: "Prompt",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "EMPTY" }));

      const { client: clientWhitespace } = createFakeClient(async () => ({
        text: "   \n\t  ",
      }));
      await expect(
        generate(clientWhitespace, {
          model: "gemini-3.6-flash",
          systemInstruction: "System",
          contents: "Prompt",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "EMPTY" }));
    });

    it("throws BLOCKED if response text is empty and candidates have safety finishReason", async () => {
      const { client } = createFakeClient(async () => ({
        text: "",
        candidates: [{ finishReason: "SAFETY" }],
      }));

      await expect(
        generate(client, {
          model: "gemini-3.6-flash",
          systemInstruction: "System",
          contents: "Prompt",
        })
      ).rejects.toThrow(expect.objectContaining({ code: "BLOCKED" }));
    });
  });

  describe("mapGeminiError error mapping", () => {
    it("returns existing AiError unchanged", () => {
      const original = new AiError("NOT_CONFIGURED");
      expect(mapGeminiError(original)).toBe(original);
    });

    it("maps 429 to RATE_LIMITED with status", () => {
      const err = Object.assign(new Error("Resource exhausted"), { status: 429 });
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe("RATE_LIMITED");
      expect(mapped.status).toBe(429);
    });

    it("maps 503 and 500+ to UNAVAILABLE with status", () => {
      const err503 = Object.assign(new Error("Service unavailable"), { status: 503 });
      const mapped503 = mapGeminiError(err503);
      expect(mapped503.code).toBe("UNAVAILABLE");
      expect(mapped503.status).toBe(503);

      const err500 = Object.assign(new Error("Internal error"), { status: 500 });
      const mapped500 = mapGeminiError(err500);
      expect(mapped500.code).toBe("UNAVAILABLE");
      expect(mapped500.status).toBe(500);
    });

    it("maps 400, 401, 403, 404 to CONFIG_ERROR with status", () => {
      for (const status of [400, 401, 403, 404]) {
        const err = Object.assign(new Error("Bad config"), { status });
        const mapped = mapGeminiError(err);
        expect(mapped.code).toBe("CONFIG_ERROR");
        expect(mapped.status).toBe(status);
      }
    });

    it("maps 408 and 504 to TIMEOUT with status", () => {
      const err408 = Object.assign(new Error("Request timeout"), { status: 408 });
      expect(mapGeminiError(err408).code).toBe("TIMEOUT");

      const err504 = Object.assign(new Error("Gateway timeout"), { status: 504 });
      expect(mapGeminiError(err504).code).toBe("TIMEOUT");
    });

    it("maps TimeoutError and AbortError DOMExceptions to TIMEOUT", () => {
      const timeoutErr = new DOMException("The operation timed out.", "TimeoutError");
      expect(mapGeminiError(timeoutErr).code).toBe("TIMEOUT");

      const abortErr = new DOMException("The operation was aborted.", "AbortError");
      expect(mapGeminiError(abortErr).code).toBe("TIMEOUT");
    });

    it("maps generic network or unknown errors to UNAVAILABLE", () => {
      const netErr = new Error("network socket closed");
      const mapped = mapGeminiError(netErr);
      expect(mapped.code).toBe("UNAVAILABLE");
      expect(mapped.status).toBeUndefined();
    });
  });

  describe("secrecy test", () => {
    it("never logs or exposes API keys or prompt contents", async () => {
      const spy = vi.spyOn(console, "error");

      const secretKey = "KEY-12345";
      const secretPrompt = "SECRET-PROMPT";

      const { client } = createFakeClient(async () => {
        const leakedMessage = `Failure with key ${secretKey} on request containing ${secretPrompt}`;
        throw Object.assign(new Error(leakedMessage), { status: 500 });
      });

      let thrownError: unknown;
      try {
        await generate(client, {
          model: "gemini-3.6-flash",
          systemInstruction: "System",
          contents: secretPrompt,
        });
      } catch (e) {
        thrownError = e;
      }

      expect(thrownError).toBeInstanceOf(AiError);
      const aiError = thrownError as AiError;

      // Verify thrown error message does not contain secrets
      expect(aiError.message).not.toContain(secretKey);
      expect(aiError.message).not.toContain(secretPrompt);

      // Verify every argument of every console.error call does not contain secrets
      expect(spy).toHaveBeenCalled();
      for (const callArgs of spy.mock.calls) {
        const serialized = JSON.stringify(callArgs);
        expect(serialized).not.toContain(secretKey);
        expect(serialized).not.toContain(secretPrompt);
      }
    });
  });
});
