import type { parseEnv } from "../env";
import { getEnv } from "../env";
import type { AiProvider, AiStatus } from "./types";
import { createDemoProvider } from "./demo";
import { createUnconfiguredProvider } from "./unconfigured";
import { createGeminiProvider } from "./gemini";

export type AiEnv = Pick<
  ReturnType<typeof parseEnv>,
  "AI_PROVIDER" | "GEMINI_API_KEY" | "GEMINI_MODEL"
>;

export function resolveAiProvider(env: AiEnv): AiProvider {
  if (env.AI_PROVIDER === "demo") {
    return createDemoProvider();
  }

  if (env.AI_PROVIDER === "gemini") {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== "") {
      return createGeminiProvider({
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
      });
    }
    return createUnconfiguredProvider();
  }

  return createUnconfiguredProvider();
}

export function resolveAiStatus(env: AiEnv): AiStatus {
  if (env.AI_PROVIDER === "demo") {
    return {
      provider: "demo",
      configured: true,
      model: "demo",
    };
  }

  const isConfigured = Boolean(
    env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== ""
  );

  return {
    provider: "gemini",
    configured: isConfigured,
    model: env.GEMINI_MODEL,
  };
}

let cachedProvider: AiProvider | null = null;
let cachedStatus: AiStatus | null = null;

export function getAiProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider = resolveAiProvider(getEnv());
  }
  return cachedProvider;
}

export function getAiStatus(): AiStatus {
  if (!cachedStatus) {
    cachedStatus = resolveAiStatus(getEnv());
  }
  return cachedStatus;
}
