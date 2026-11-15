import { z } from "zod";
import {
  AI_INPUT_LIMITS,
  structuredReflectionSchema,
  newsSummarySchema,
  type AiProvider,
  type StructuredReflection,
  type NewsSummary,
} from "./types";
import { AiError } from "./errors";
import { requireText } from "./input";
import {
  TUTOR_SYSTEM_PROMPT,
  REFLECTION_SYSTEM_PROMPT,
  NEWS_SYSTEM_PROMPT,
  buildTutorContents,
  buildReflectionContents,
  buildNewsContents,
} from "./prompts";
import {
  generate,
  createSdkClient,
  type GeminiClientLike,
} from "./gemini-core";

function toJsonSchema(schema: z.ZodType): unknown {
  const jsonSchema = z.toJSONSchema(schema);
  if (
    typeof jsonSchema === "object" &&
    jsonSchema !== null &&
    "$schema" in jsonSchema
  ) {
    const copy = { ...jsonSchema };
    delete copy.$schema;
    return copy;
  }
  return jsonSchema;
}

function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3).trim();
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiError("MALFORMED");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiError("MALFORMED");
  }

  return result.data;
}

export function createGeminiProvider(options: {
  apiKey: string;
  model: string;
  client?: GeminiClientLike;
}): AiProvider {
  const client = options.client ?? createSdkClient(options.apiKey);
  const model = options.model;

  return {
    name: "gemini",
    model,

    async tutorAnswer(input: { prompt: string }): Promise<string> {
      requireText(input.prompt, AI_INPUT_LIMITS.tutorPrompt);
      const contents = buildTutorContents(input.prompt);

      return generate(client, {
        model,
        systemInstruction: TUTOR_SYSTEM_PROMPT,
        contents,
      });
    },

    async structureReflection(input: {
      sessionTitle: string;
      rawNotes: string;
    }): Promise<StructuredReflection> {
      requireText(input.sessionTitle, AI_INPUT_LIMITS.sessionTitle);
      requireText(input.rawNotes, AI_INPUT_LIMITS.rawNotes);

      const contents = buildReflectionContents(input);
      const jsonSchema = toJsonSchema(structuredReflectionSchema);

      const raw = await generate(client, {
        model,
        systemInstruction: REFLECTION_SYSTEM_PROMPT,
        contents,
        jsonSchema,
      });

      const parsed = parseJson(raw, structuredReflectionSchema);

      const reflection: StructuredReflection = {
        concepts: parsed.concepts.trim(),
        takeaways: parsed.takeaways.trim(),
        observations: parsed.observations.trim(),
        insights: parsed.insights.trim(),
        openQuestions: parsed.openQuestions.trim(),
      };

      if (
        !reflection.concepts &&
        !reflection.takeaways &&
        !reflection.observations &&
        !reflection.insights &&
        !reflection.openQuestions
      ) {
        throw new AiError("EMPTY");
      }

      return reflection;
    },

    async summarizeNews(input: {
      headline: string;
      companies: string;
      sourceName: string;
      sourceText: string;
    }): Promise<NewsSummary> {
      requireText(input.headline, AI_INPUT_LIMITS.headline);
      requireText(input.companies, AI_INPUT_LIMITS.companies, true);
      requireText(input.sourceName, AI_INPUT_LIMITS.sourceName, true);
      requireText(input.sourceText, AI_INPUT_LIMITS.sourceText);

      const contents = buildNewsContents(input);
      const jsonSchema = toJsonSchema(newsSummarySchema);

      const raw = await generate(client, {
        model,
        systemInstruction: NEWS_SYSTEM_PROMPT,
        contents,
        jsonSchema,
      });

      const parsed = parseJson(raw, newsSummarySchema);

      const summary: NewsSummary = {
        factSummary: parsed.factSummary.trim(),
        whyItMatters: parsed.whyItMatters.trim(),
      };

      if (!summary.factSummary && !summary.whyItMatters) {
        throw new AiError("EMPTY");
      }

      return summary;
    },
  };
}
