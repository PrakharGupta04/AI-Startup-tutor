import { z } from "zod";

export const DEMO_PREFIX = "[DEMO MODE – not a real AI response]";

export const AI_INPUT_LIMITS = {
  tutorPrompt: 2000,
  sessionTitle: 200,
  rawNotes: 10000,
  headline: 300,
  companies: 300,
  sourceName: 150,
  sourceText: 15000,
} as const;

export const structuredReflectionSchema = z.object({
  concepts: z.string(),
  takeaways: z.string(),
  observations: z.string(),
  insights: z.string(),
  openQuestions: z.string(),
});

export const newsSummarySchema = z.object({
  factSummary: z.string(),
  whyItMatters: z.string(),
});

export type StructuredReflection = z.infer<typeof structuredReflectionSchema>;
export type NewsSummary = z.infer<typeof newsSummarySchema>;

export type AiProviderName = "gemini" | "demo";

export interface AiProvider {
  readonly name: AiProviderName;
  readonly model: string;
  tutorAnswer(input: { prompt: string }): Promise<string>;
  structureReflection(input: {
    sessionTitle: string;
    rawNotes: string;
  }): Promise<StructuredReflection>;
  summarizeNews(input: {
    headline: string;
    companies: string;
    sourceName: string;
    sourceText: string;
  }): Promise<NewsSummary>;
}

export type AiStatus = {
  provider: AiProviderName;
  configured: boolean;
  model: string;
};
