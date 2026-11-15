import {
  DEMO_PREFIX,
  AI_INPUT_LIMITS,
  type AiProvider,
  type StructuredReflection,
  type NewsSummary,
} from "./types";
import { requireText } from "./input";

export function createDemoProvider(): AiProvider {
  return {
    name: "demo",
    model: "demo",

    async tutorAnswer(input: { prompt: string }): Promise<string> {
      requireText(input.prompt, AI_INPUT_LIMITS.tutorPrompt);
      return `${DEMO_PREFIX}\n\nThis is a placeholder response. No AI model was used.`;
    },

    async structureReflection(input: {
      sessionTitle: string;
      rawNotes: string;
    }): Promise<StructuredReflection> {
      requireText(input.sessionTitle, AI_INPUT_LIMITS.sessionTitle);
      requireText(input.rawNotes, AI_INPUT_LIMITS.rawNotes);

      const placeholder = `- ${DEMO_PREFIX} Placeholder text. Replace it with your own.`;

      return {
        concepts: placeholder,
        takeaways: placeholder,
        observations: placeholder,
        insights: placeholder,
        openQuestions: placeholder,
      };
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

      const placeholder = `${DEMO_PREFIX} Placeholder text. No AI was used.`;

      return {
        factSummary: placeholder,
        whyItMatters: placeholder,
      };
    },
  };
}
