"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveNewsAction,
  generateNewsAction,
  publishNewsAction,
  unpublishNewsAction,
  deleteNewsAction,
} from "@/app/(app)/news/actions";
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  type NewsCategory,
} from "@/lib/constants";
import {
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Badge,
} from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";
import { AiNotice } from "@/components/ai-notice";

export interface NewsFormProps {
  initial: {
    id?: number;
    category: string;
    headline: string;
    companies: string;
    publishedOn: string;
    sourceName: string;
    sourceUrl: string;
    sourceText: string;
    factSummary: string;
    whyItMatters: string;
    status: "DRAFT" | "PUBLISHED";
    aiAssisted: boolean;
  };
  aiConfigured: boolean;
  aiIsDemo: boolean;
}

export function NewsForm({
  initial,
  aiConfigured,
  aiIsDemo,
}: NewsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    "saving" | "generating" | "publishing" | "unpublishing" | "deleting" | null
  >(null);

  const [id, setId] = useState<number | undefined>(initial.id);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(initial.status);
  const [aiAssisted, setAiAssisted] = useState<boolean>(initial.aiAssisted);

  const [category, setCategory] = useState<string>(initial.category);
  const [headline, setHeadline] = useState<string>(initial.headline);
  const [companies, setCompanies] = useState<string>(initial.companies);
  const [publishedOn, setPublishedOn] = useState<string>(initial.publishedOn);
  const [sourceName, setSourceName] = useState<string>(initial.sourceName);
  const [sourceUrl, setSourceUrl] = useState<string>(initial.sourceUrl);
  const [sourceText, setSourceText] = useState<string>(initial.sourceText);
  const [factSummary, setFactSummary] = useState<string>(initial.factSummary);
  const [whyItMatters, setWhyItMatters] = useState<string>(initial.whyItMatters);

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
    category,
    headline,
    companies,
    publishedOn: publishedOn.trim() || "",
    sourceName,
    sourceUrl,
    sourceText,
    factSummary,
    whyItMatters,
  });

  const handleSave = () => {
    clearFeedback();
    setPendingAction("saving");

    startTransition(async () => {
      try {
        const result = await saveNewsAction(getPayload());
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

  const handleGenerate = () => {
    clearFeedback();

    const hasExistingSummary =
      Boolean(factSummary.trim()) || Boolean(whyItMatters.trim());

    if (hasExistingSummary) {
      const confirmed = window.confirm(
        "This will replace the summary fields. Continue?"
      );
      if (!confirmed) {
        return;
      }
    }

    setPendingAction("generating");

    startTransition(async () => {
      try {
        // 1. Save changes first so pasted text is persisted
        const saveResult = await saveNewsAction(getPayload());
        if (!saveResult.ok) {
          setGeneralError(saveResult.error);
          if (saveResult.fieldErrors) {
            setFieldErrors(saveResult.fieldErrors);
          }
          return;
        }

        const savedId = saveResult.data.id;
        setId(savedId);

        // 2. Call AI summarization
        const summaryResult = await generateNewsAction({ id: savedId });
        if (!summaryResult.ok) {
          setGeneralError(summaryResult.error);
          if (summaryResult.fieldErrors) {
            setFieldErrors(summaryResult.fieldErrors);
          }
          return;
        }

        setFactSummary(summaryResult.data.factSummary);
        setWhyItMatters(summaryResult.data.whyItMatters);
        setAiAssisted(true);
        setSuccessMessage("Generated. Review and edit before publishing.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handlePublish = () => {
    clearFeedback();
    setPendingAction("publishing");

    startTransition(async () => {
      try {
        // 1. Save all fields first
        const saveResult = await saveNewsAction(getPayload());
        if (!saveResult.ok) {
          setGeneralError(saveResult.error);
          if (saveResult.fieldErrors) {
            setFieldErrors(saveResult.fieldErrors);
          }
          return;
        }

        const savedId = saveResult.data.id;
        setId(savedId);

        // 2. Call publish
        const pubResult = await publishNewsAction({ id: savedId });
        if (!pubResult.ok) {
          setGeneralError(pubResult.error);
          if (pubResult.fieldErrors) {
            setFieldErrors(pubResult.fieldErrors);
          }
          return;
        }

        router.push("/news");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleUnpublish = () => {
    if (!id) return;
    clearFeedback();
    setPendingAction("unpublishing");

    startTransition(async () => {
      try {
        const result = await unpublishNewsAction({ id });
        if (!result.ok) {
          setGeneralError(result.error);
          return;
        }

        setStatus("DRAFT");
        setSuccessMessage("Moved back to drafts.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleDelete = () => {
    if (!id) return;
    const confirmed = window.confirm(
      "Delete this news item? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    clearFeedback();
    setPendingAction("deleting");

    startTransition(async () => {
      try {
        const result = await deleteNewsAction({ id });
        if (!result.ok) {
          setGeneralError(result.error);
          return;
        }

        router.push("/news/manage");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {generalError && <ErrorMessage message={generalError} />}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md">
          {successMessage}
        </div>
      )}

      {/* Status banner if published */}
      {status === "PUBLISHED" && (
        <div className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200 text-sky-800 text-sm rounded-md flex-wrap">
          <Badge variant="success">Published</Badge>
          {aiAssisted && <Badge variant="info">AI-assisted</Badge>}
          <span>This news item is visible to all cohort members.</span>
        </div>
      )}
      {status === "DRAFT" && aiAssisted && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-md flex-wrap">
          <Badge variant="warning">Draft</Badge>
          <Badge variant="info">AI-assisted</Badge>
          <span>Summary generated with AI. Review and edit before publishing.</span>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. Category */}
        <Field
          label="Category"
          htmlFor="category"
          error={fieldErrors.category}
        >
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isPending}
            required
          >
            <option value="">Choose a category</option>
            {NEWS_CATEGORIES.map((catKey) => (
              <option key={catKey} value={catKey}>
                {NEWS_CATEGORY_LABELS[catKey as NewsCategory]}
              </option>
            ))}
          </Select>
        </Field>

        {/* 2. Headline */}
        <Field
          label="Headline"
          htmlFor="headline"
          error={fieldErrors.headline}
        >
          <Input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            disabled={isPending}
            maxLength={300}
            required
          />
        </Field>

        {/* 3. Companies involved */}
        <Field
          label="Companies involved"
          htmlFor="companies"
          hint="Comma-separated"
          error={fieldErrors.companies}
        >
          <Input
            id="companies"
            type="text"
            value={companies}
            onChange={(e) => setCompanies(e.target.value)}
            disabled={isPending}
            maxLength={300}
          />
        </Field>

        {/* 4. Source name */}
        <Field
          label="Source name"
          htmlFor="sourceName"
          error={fieldErrors.sourceName}
        >
          <Input
            id="sourceName"
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            disabled={isPending}
            maxLength={150}
            required
          />
        </Field>

        {/* 5. Source link */}
        <Field
          label="Source link"
          htmlFor="sourceUrl"
          error={fieldErrors.sourceUrl}
        >
          <Input
            id="sourceUrl"
            type="url"
            placeholder="https://"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            disabled={isPending}
            maxLength={2000}
            required
          />
        </Field>

        {/* 6. Published date */}
        <Field
          label="Published date"
          htmlFor="publishedOn"
          hint="Leave empty if unknown"
          error={fieldErrors.publishedOn}
        >
          <Input
            id="publishedOn"
            type="date"
            value={publishedOn}
            onChange={(e) => setPublishedOn(e.target.value)}
            disabled={isPending}
          />
        </Field>

        {/* 7. Article text or notes */}
        <Field
          label="Article text or your notes"
          htmlFor="sourceText"
          hint="Paste the relevant text from the article. The AI summarises only this text; it cannot open the link. This text is visible to instructors only."
          error={fieldErrors.sourceText}
        >
          <Textarea
            id="sourceText"
            rows={10}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            disabled={isPending}
            maxLength={15000}
          />
        </Field>

        {/* 8. Reported facts (summary) */}
        <Field
          label="Reported facts (summary)"
          htmlFor="factSummary"
          hint="Only what the source reports"
          error={fieldErrors.factSummary}
        >
          <Textarea
            id="factSummary"
            rows={4}
            value={factSummary}
            onChange={(e) => setFactSummary(e.target.value)}
            disabled={isPending}
            maxLength={3000}
          />
        </Field>

        {/* 9. Why it matters (interpretation) */}
        <Field
          label="Why it matters (interpretation)"
          htmlFor="whyItMatters"
          hint="Your interpretation for corporate–startup collaboration"
          error={fieldErrors.whyItMatters}
        >
          <Textarea
            id="whyItMatters"
            rows={4}
            value={whyItMatters}
            onChange={(e) => setWhyItMatters(e.target.value)}
            disabled={isPending}
            maxLength={3000}
          />
        </Field>
      </div>

      {/* AI Notice */}
      <AiNotice />

      {/* Demo mode badge if demo */}
      {aiIsDemo && (
        <div className="flex items-center gap-2">
          <Badge variant="warning">Demo mode: placeholder output, not real AI</Badge>
        </div>
      )}

      {/* Action buttons bar */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save draft / Save changes */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            disabled={isPending}
          >
            {pendingAction === "saving"
              ? "Saving…"
              : status === "PUBLISHED"
              ? "Save changes"
              : "Save draft"}
          </Button>

          {/* Generate with AI */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            disabled={isPending || !aiConfigured || !sourceText.trim()}
          >
            {pendingAction === "generating"
              ? "Generating…"
              : !aiConfigured
              ? "AI is not configured"
              : "Generate with AI"}
          </Button>

          {/* Publish (if draft) */}
          {status === "DRAFT" && (
            <Button
              type="button"
              variant="primary"
              onClick={handlePublish}
              disabled={isPending}
            >
              {pendingAction === "publishing" ? "Publishing…" : "Publish"}
            </Button>
          )}

          {/* Unpublish (if published) */}
          {status === "PUBLISHED" && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleUnpublish}
              disabled={isPending}
            >
              {pendingAction === "unpublishing" ? "Unpublishing…" : "Unpublish"}
            </Button>
          )}
        </div>

        {/* Delete (if existing item) */}
        {id !== undefined && (
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isPending}
          >
            {pendingAction === "deleting" ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </div>
  );
}
