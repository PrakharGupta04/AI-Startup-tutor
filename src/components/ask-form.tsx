"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { askAction } from "@/app/(app)/tutor/actions";
import { Button, Textarea, Badge } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";

export interface AskFormProps {
  aiConfigured: boolean;
  aiIsDemo: boolean;
}

export function AskForm({ aiConfigured, aiIsDemo }: AskFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [statusFailureInfo, setStatusFailureInfo] = useState<string | null>(
    null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldError(null);
    setStatusFailureInfo(null);

    const trimmed = prompt.trim();
    if (!trimmed) {
      setFieldError("Enter a question.");
      return;
    }

    startTransition(async () => {
      const result = await askAction({ prompt: trimmed });

      if (!result.ok) {
        setGeneralError(result.error);
        if (result.fieldErrors?.prompt) {
          setFieldError(result.fieldErrors.prompt);
        }
        return;
      }

      // Success: clear textarea and refresh
      setPrompt("");
      router.refresh();

      if (result.data.status === "FAILED") {
        const msg = result.data.errorMessage
          ? `${result.data.errorMessage} Your question was saved in the log. You can retry it there.`
          : "Your question was saved in the log. You can retry it there.";
        setStatusFailureInfo(msg);
      }
    });
  };

  const charCount = prompt.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && <ErrorMessage message={generalError} />}
      {statusFailureInfo && <ErrorMessage message={statusFailureInfo} />}

      <div className="space-y-1.5">
        <label
          htmlFor="tutorPrompt"
          className="block text-sm font-medium text-ink"
        >
          Ask a question
        </label>
        <Textarea
          id="tutorPrompt"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about corporate innovation, venturing models, accelerator mechanics, or startup pilots..."
          disabled={isPending}
          maxLength={2000}
          required
        />
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <div>
            {fieldError && (
              <span className="text-danger font-medium" role="alert">
                {fieldError}
              </span>
            )}
          </div>
          <span
            className={
              charCount > 2000 ? "text-danger font-semibold" : undefined
            }
          >
            {charCount} / 2000
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {aiIsDemo && (
            <Badge variant="warning">
              Demo mode: placeholder answers, not real AI
            </Badge>
          )}
          {!aiConfigured && (
            <span className="text-xs text-danger font-medium">
              AI is not configured.
            </span>
          )}
          {isPending && (
            <span className="text-xs text-ink-muted">
              The tutor is thinking… this can take up to 30 seconds.
            </span>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isPending || !aiConfigured}
        >
          {isPending ? "Asking…" : "Ask the tutor"}
        </Button>
      </div>
    </form>
  );
}
