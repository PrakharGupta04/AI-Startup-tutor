import { getEnv } from "../src/lib/env";
import { resolveAiProvider, resolveAiStatus } from "../src/lib/ai";
import { AI_ERROR_MESSAGES, isAiError } from "../src/lib/ai/errors";

async function main() {
  let env;
  try {
    env = getEnv();
  } catch (err) {
    console.error(
      "Failed to read environment:",
      err instanceof Error ? err.message : "Unexpected error occurred."
    );
    process.exit(1);
  }

  const status = resolveAiStatus(env);
  const provider = resolveAiProvider(env);

  console.log(`Provider: ${status.provider} (model: ${status.model})`);

  if (status.provider === "demo") {
    console.log("Demo provider: this is NOT a real AI check");
    process.exit(0);
  }

  if (status.provider === "gemini" && !status.configured) {
    console.error(AI_ERROR_MESSAGES.NOT_CONFIGURED);
    process.exit(1);
  }

  let hasError = false;

  // Diagnostic inputs only. These are never shown in the app.

  // 1. Tutor question
  {
    const start = Date.now();
    try {
      const answer = await provider.tutorAnswer({
        prompt: "What is an accelerator?",
      });
      const elapsed = Date.now() - start;
      const preview = answer.slice(0, 80).replace(/\r?\n/g, " ");
      console.log(`Tutor: PASS (${elapsed}ms) - ${preview}`);
    } catch (err) {
      const elapsed = Date.now() - start;
      hasError = true;
      if (isAiError(err)) {
        const statusStr =
          err.status !== undefined ? ` [HTTP ${err.status}]` : "";
        console.error(
          `Tutor: FAIL (${elapsed}ms) - [${err.code}] ${err.message}${statusStr}`
        );
      } else {
        console.error(
          `Tutor: FAIL (${elapsed}ms) - Unexpected error occurred.`
        );
      }
    }
  }

  // 2. Reflection notes
  {
    const start = Date.now();
    try {
      const rawNotes = [
        "We compared corporate venture capital and accelerators.",
        "CVC arms invest for strategic fit as well as financial return.",
        "Accelerators run fixed-length cohorts and usually take a small equity stake.",
        "Takeaway: a corporate should pick the model that matches its goal. I am not sure how pilots turn into real contracts.",
      ].join("\n");
      const reflection = await provider.structureReflection({
        sessionTitle: "Corporate venture capital vs accelerators",
        rawNotes,
      });
      const elapsed = Date.now() - start;
      const nonEmptyFields = (
        Object.keys(reflection) as Array<keyof typeof reflection>
      ).filter((k) => reflection[k].length > 0);
      console.log(
        `Reflection: PASS (${elapsed}ms) - Non-empty fields: ${nonEmptyFields.join(", ")}`
      );
    } catch (err) {
      const elapsed = Date.now() - start;
      hasError = true;
      if (isAiError(err)) {
        const statusStr =
          err.status !== undefined ? ` [HTTP ${err.status}]` : "";
        console.error(
          `Reflection: FAIL (${elapsed}ms) - [${err.code}] ${err.message}${statusStr}`
        );
      } else {
        console.error(
          `Reflection: FAIL (${elapsed}ms) - Unexpected error occurred.`
        );
      }
    }
  }

  // 3. News summary
  {
    const start = Date.now();
    try {
      const news = await provider.summarizeNews({
        headline: "ExampleCorp starts a pilot with ExampleStartup",
        companies: "ExampleCorp, ExampleStartup",
        sourceName: "Example News",
        sourceText:
          "ExampleCorp announced a three-month pilot with ExampleStartup to test its route-planning software in two warehouses. The companies said they will decide on a wider rollout after the pilot ends.",
      });
      const elapsed = Date.now() - start;
      console.log(
        `News: PASS (${elapsed}ms) - factSummary: ${news.factSummary.length} chars, whyItMatters: ${news.whyItMatters.length} chars`
      );
    } catch (err) {
      const elapsed = Date.now() - start;
      hasError = true;
      if (isAiError(err)) {
        const statusStr =
          err.status !== undefined ? ` [HTTP ${err.status}]` : "";
        console.error(
          `News: FAIL (${elapsed}ms) - [${err.code}] ${err.message}${statusStr}`
        );
      } else {
        console.error(
          `News: FAIL (${elapsed}ms) - Unexpected error occurred.`
        );
      }
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(() => {
  console.error("ai-check failed: Unexpected error occurred.");
  process.exit(1);
});
