import type {
  AiProvider,
  StructuredReflection,
  NewsSummary,
} from "./types";
import { AiError } from "./errors";

export function createUnconfiguredProvider(): AiProvider {
  return {
    name: "gemini",
    model: "none",

    async tutorAnswer(): Promise<string> {
      throw new AiError("NOT_CONFIGURED");
    },

    async structureReflection(): Promise<StructuredReflection> {
      throw new AiError("NOT_CONFIGURED");
    },

    async summarizeNews(): Promise<NewsSummary> {
      throw new AiError("NOT_CONFIGURED");
    },
  };
}
