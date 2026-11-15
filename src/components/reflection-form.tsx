"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDraftAction,
  structureAction,
  clearStructuredAction,
  submitReflectionAction,
} from "@/app/(app)/reflections/actions";
import { Button, Field, Input, Textarea, Badge } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";
import { AiNotice } from "@/components/ai-notice";

export interface ReflectionFormProps {
  initial: {
    id?: number;
    sessionTitle: string;
    sessionDate: string;
    rawNotes: string;
    concepts: string;
    takeaways: string;
    observations: string;
    insights: string;
    openQuestions: string;
    aiStructured: boolean;
    status: "DRAFT" | "SUBMITTED";
  };
  aiConfigured: boolean;
  aiIsDemo: boolean;
}

export function ReflectionForm({
  initial,
  aiConfigured,
  aiIsDemo,
}: ReflectionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    "saving" | "structuring" | "submitting" | "clearing" | null
  >(null);

  const [id, setId] = useState<number | undefined>(initial.id);
  const [status] = useState<"DRAFT" | "SUBMITTED">(initial.status);
  const [aiStructured, setAiStructured] = useState<boolean>(initial.aiStructured);

  const [sessionTitle, setSessionTitle] = useState(initial.sessionTitle);
  const [sessionDate, setSessionDate] = useState(initial.sessionDate);
  const [rawNotes, setRawNotes] = useState(initial.rawNotes);
  const [concepts, setConcepts] = useState(initial.concepts);
  const [takeaways, setTakeaways] = useState(initial.takeaways);
  const [observations, setObservations] = useState(initial.observations);
  const [insights, setInsights] = useState(initial.insights);
  const [openQuestions, setOpenQuestions] = useState(initial.openQuestions);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFeedback = () => {
    setGeneralError(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  const getPayload = (currentId?: number) => ({
    id: currentId ?? id,
    sessionTitle,
    sessionDate,
    rawNotes,
    concepts,
    takeaways,
    observations,
    insights,
    openQuestions,
  });

  const handleSave = () => {
    clearFeedback();
    setPendingAction("saving");

    startTransition(async () => {
      try {
        const result = await saveDraftAction(getPayload());
        if (!result.ok) {
          setGeneralError(result.error);
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          return;
        }

        setId(result.data.id);
        setSuccessMessage("Saved.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleStructure = () => {
    clearFeedback();

    const hasExistingStructured =
      Boolean(concepts.trim()) ||
      Boolean(takeaways.trim()) ||
      Boolean(observations.trim()) ||
      Boolean(insights.trim()) ||
      Boolean(openQuestions.trim());

    if (hasExistingStructured) {
      const confirmed = window.confirm(
        "This will replace the structured fields. Continue?"
      );
      if (!confirmed) {
        return;
      }
    }

    setPendingAction("structuring");

    startTransition(async () => {
      try {
        // 1. Save draft first so raw notes are guaranteed to be persisted
        const saveResult = await saveDraftAction(getPayload());
        if (!saveResult.ok) {
          setGeneralError(saveResult.error);
          if (saveResult.fieldErrors) {
            setFieldErrors(saveResult.fieldErrors);
          }
          return;
        }

        const savedId = saveResult.data.id;
        setId(savedId);

        // 2. Call AI structuring
        const structureResult = await structureAction({ id: savedId });
        if (!structureResult.ok) {
          setGeneralError(structureResult.error);
          return;
        }

        setConcepts(structureResult.data.concepts);
        setTakeaways(structureResult.data.takeaways);
        setObservations(structureResult.data.observations);
        setInsights(structureResult.data.insights);
        setOpenQuestions(structureResult.data.openQuestions);
        setAiStructured(true);

        setSuccessMessage(
          "Structured. Review and edit the result before submitting."
        );
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleClearStructured = () => {
    if (!id) return;
    clearFeedback();
    setPendingAction("clearing");

    startTransition(async () => {
      try {
        const result = await clearStructuredAction({ id });
        if (!result.ok) {
          setGeneralError(result.error);
          return;
        }

        setConcepts("");
        setTakeaways("");
        setObservations("");
        setInsights("");
        setOpenQuestions("");
        setAiStructured(false);
        setSuccessMessage("Structured output cleared.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleSubmit = () => {
    clearFeedback();
    setPendingAction("submitting");

    startTransition(async () => {
      try {
        // Save latest edits first
        const saveResult = await saveDraftAction(getPayload());
        if (!saveResult.ok) {
          setGeneralError(saveResult.error);
          if (saveResult.fieldErrors) {
            setFieldErrors(saveResult.fieldErrors);
          }
          return;
        }

        const targetId = saveResult.data.id;
        setId(targetId);

        // Submit reflection
        const submitResult = await submitReflectionAction({ id: targetId });
        if (!submitResult.ok) {
          setGeneralError(submitResult.error);
          if (submitResult.fieldErrors) {
            setFieldErrors(submitResult.fieldErrors);
          }
          return;
        }

        router.push("/reflections/" + targetId);
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {generalError && <ErrorMessage message={generalError} />}

      {successMessage && (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      {/* Top inputs: Session title and date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Field
            label="Session title"
            htmlFor="sessionTitle"
            error={fieldErrors.sessionTitle}
          >
            <Input
              id="sessionTitle"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g. Corporate Venture Capital vs Accelerators"
              disabled={isPending}
              required
            />
          </Field>
        </div>

        <div>
          <Field
            label="Session date"
            htmlFor="sessionDate"
            error={fieldErrors.sessionDate}
          >
            <Input
              id="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              disabled={isPending}
              required
            />
          </Field>
        </div>
      </div>

      {/* Two-column layout on md+: Left (raw notes), Right (structured fields) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Your notes */}
        <div className="space-y-2">
          <Field
            label="Your notes"
            htmlFor="rawNotes"
            hint="Write freely. Your notes are saved before the AI runs and are never replaced."
            error={fieldErrors.rawNotes}
          >
            <Textarea
              id="rawNotes"
              rows={14}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Paste or write your raw, unstructured session notes here..."
              disabled={isPending}
              className="font-mono text-sm leading-relaxed"
            />
          </Field>
        </div>

        {/* Right Column: 5 Structured Fields */}
        <div className="space-y-4">
          <Field
            label="Concepts (required to submit)"
            htmlFor="concepts"
            error={fieldErrors.concepts}
          >
            <Textarea
              id="concepts"
              rows={3}
              value={concepts}
              onChange={(e) => setConcepts(e.target.value)}
              placeholder="Core theories, models, or frameworks introduced..."
              disabled={isPending}
            />
          </Field>

          <Field
            label="Key takeaways (required to submit)"
            htmlFor="takeaways"
            error={fieldErrors.takeaways}
          >
            <Textarea
              id="takeaways"
              rows={3}
              value={takeaways}
              onChange={(e) => setTakeaways(e.target.value)}
              placeholder="Primary lessons or conclusions..."
              disabled={isPending}
            />
          </Field>

          <Field
            label="Observations"
            htmlFor="observations"
            error={fieldErrors.observations}
          >
            <Textarea
              id="observations"
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Class discussion dynamics, examples, or notable remarks..."
              disabled={isPending}
            />
          </Field>

          <Field
            label="Insights"
            htmlFor="insights"
            error={fieldErrors.insights}
          >
            <Textarea
              id="insights"
              rows={2}
              value={insights}
              onChange={(e) => setInsights(e.target.value)}
              placeholder="How this applies to your corporate context or ventures..."
              disabled={isPending}
            />
          </Field>

          <Field
            label="Open questions (required to submit)"
            htmlFor="openQuestions"
            error={fieldErrors.openQuestions}
          >
            <Textarea
              id="openQuestions"
              rows={3}
              value={openQuestions}
              onChange={(e) => setOpenQuestions(e.target.value)}
              placeholder="Unresolved questions, challenges, or next steps to explore..."
              disabled={isPending}
            />
          </Field>
        </div>
      </div>

      {/* AI notice above the action buttons */}
      <AiNotice />

      {/* Action buttons bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Structure with AI */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleStructure}
            disabled={isPending || !aiConfigured}
          >
            {!aiConfigured
              ? "AI is not configured."
              : pendingAction === "structuring"
              ? "Structuring…"
              : "Structure with AI"}
          </Button>

          {aiIsDemo && aiConfigured && (
            <Badge variant="warning">
              Demo mode: placeholder output, not real AI
            </Badge>
          )}

          {/* Clear AI output */}
          {aiStructured && id && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearStructured}
              disabled={isPending}
            >
              {pendingAction === "clearing" ? "Clearing…" : "Clear AI output"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Save draft or Save changes */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            disabled={isPending}
          >
            {pendingAction === "saving"
              ? "Saving…"
              : status === "SUBMITTED"
              ? "Save changes"
              : "Save draft"}
          </Button>

          {/* Submit reflection (shown only when status is DRAFT) */}
          {status === "DRAFT" && (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {pendingAction === "submitting" ? "Submitting…" : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
