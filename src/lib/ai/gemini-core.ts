import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentConfig,
} from "@google/genai";
import { AiError, isAiError } from "./errors";

export const AI_TIMEOUT_MS = 30_000;
export const AI_MAX_OUTPUT_TOKENS = 8192;

export type GeminiResponseLike = {
  text?: string;
  promptFeedback?: { blockReason?: unknown };
  candidates?: Array<{ finishReason?: unknown }>;
};

export interface GeminiClientLike {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config?: GenerateContentConfig;
    }): Promise<GeminiResponseLike>;
  };
}

export function createSdkClient(apiKey: string): GeminiClientLike {
  const ai = new GoogleGenAI({ apiKey });

  return {
    models: {
      async generateContent(params: {
        model: string;
        contents: string;
        config?: GenerateContentConfig;
      }): Promise<GeminiResponseLike> {
        const response = await ai.models.generateContent({
          model: params.model,
          contents: params.contents,
          config: params.config,
        });

        return {
          text: response.text,
          promptFeedback: response.promptFeedback,
          candidates: response.candidates,
        };
      },
    },
  };
}

export async function generate(
  client: GeminiClientLike,
  opts: {
    model: string;
    systemInstruction: string;
    contents: string;
    jsonSchema?: unknown;
  }
): Promise<string> {
  const config: GenerateContentConfig = {
    systemInstruction: opts.systemInstruction,
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW,
    },
  };

  if (opts.jsonSchema !== undefined) {
    config.responseMimeType = "application/json";
    config.responseJsonSchema = opts.jsonSchema;
  }

  let response: GeminiResponseLike;
  try {
    response = await client.models.generateContent({
      model: opts.model,
      contents: opts.contents,
      config,
    });
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (response.promptFeedback?.blockReason) {
    throw new AiError("BLOCKED");
  }

  const trimmedText = response.text?.trim();

  if (!trimmedText) {
    const safetyReasons = [
      "SAFETY",
      "PROHIBITED_CONTENT",
      "BLOCKLIST",
      "RECITATION",
      "SPII",
    ];

    const isSafetyBlocked = response.candidates?.some((c) => {
      if (!c.finishReason) {
        return false;
      }
      const reasonStr = String(c.finishReason).toUpperCase();
      return safetyReasons.some((safety) => reasonStr.includes(safety));
    });

    if (isSafetyBlocked) {
      throw new AiError("BLOCKED");
    }

    throw new AiError("EMPTY");
  }

  return trimmedText;
}

function hasStatus(e: unknown): e is { status: number } {
  if (typeof e === "object" && e !== null && "status" in e) {
    return typeof e.status === "number";
  }
  return false;
}

export function mapGeminiError(e: unknown): AiError {
  if (isAiError(e)) {
    return e;
  }

  const name =
    e instanceof Error
      ? e.name
      : typeof e === "object" && e !== null && "name" in e && typeof e.name === "string"
        ? e.name
        : "UnknownError";

  if (name === "TimeoutError" || name === "AbortError") {
    console.error("Gemini request failed", { status: undefined, name });
    return new AiError("TIMEOUT");
  }

  const status = hasStatus(e) ? e.status : undefined;

  console.error("Gemini request failed", { status, name });

  if (status === 429) {
    return new AiError("RATE_LIMITED", { status });
  }

  if (status === 408 || status === 504) {
    return new AiError("TIMEOUT", { status });
  }

  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return new AiError("CONFIG_ERROR", { status });
  }

  if (status !== undefined && status >= 500) {
    return new AiError("UNAVAILABLE", { status });
  }

  return new AiError("UNAVAILABLE", { status });
}
