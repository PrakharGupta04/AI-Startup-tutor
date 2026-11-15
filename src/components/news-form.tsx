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
  Card,
} from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";

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

        const newId = result.data.id;
        setId(newId);
        setSuccessMessage("News item saved.");

        if (!id) {
          router.replace(`/news/manage/${newId}`);
        }
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleGenerate = () => {
    clearFeedback();

    if (!sourceText.trim()) {
      setGeneralError("Please enter article text before generating summaries.");
      return;
    }

    setPendingAction("generating");

    startTransition(async () => {
      try {
        const saveResult = await saveNewsAction(getPayload());
        if (!saveResult.ok) {
          setGeneralError(saveResult.error);
          if (saveResult.fieldErrors) {
            setFieldErrors(saveResult.fieldErrors);
          }
          return;
        }

        const targetId = saveResult.data.id;
        setId(targetId);

        const genResult = await generateNewsAction({ id: targetId });
        if (!genResult.ok) {
          setGeneralError(genResult.error);
          return;
        }

        setFactSummary(genResult.data.factSummary);
        setWhyItMatters(genResult.data.whyItMatters);
        setAiAssisted(true);
        setSuccessMessage("Summary generated with AI. Please review and edit.");

        if (!id) {
          router.replace(`/news/manage/${targetId}`);
        }
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
        const saveResult = await saveNewsAction(getPayload());
        if (!saveResult.ok) {
          setGeneralError(saveResult.error);
          if (saveResult.fieldErrors) {
            setFieldErrors(saveResult.fieldErrors);
          }
          return;
        }

        const targetId = saveResult.data.id;
        setId(targetId);

        const pubResult = await publishNewsAction({ id: targetId });
        if (!pubResult.ok) {
          setGeneralError(pubResult.error);
          if (pubResult.fieldErrors) {
            setFieldErrors(pubResult.fieldErrors);
          }
          return;
        }

        setStatus("PUBLISHED");
        setSuccessMessage("News item published.");

        if (!id) {
          router.replace(`/news/manage/${targetId}`);
        }
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
        setSuccessMessage("News item returned to draft status.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleDelete = () => {
    if (!id) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this news item? This cannot be undone."
    );
    if (!confirmed) return;

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
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      {generalError && <ErrorMessage message={generalError} />}

      {successMessage && (
        <div
          role="status"
          className="rounded-md border border-success/20 bg-success-soft p-4 text-sm text-success"
        >
          {successMessage}
        </div>
      )}

      {status === "PUBLISHED" && (
        <div className="flex items-center gap-2 p-3 bg-canvas border border-line text-ink text-sm rounded-md flex-wrap">
          <Badge variant="success">Published</Badge>
          <span>Visible to cohort members.</span>
        </div>
      )}

      {status === "DRAFT" && aiAssisted && (
        <div className="flex items-center gap-2 p-3 bg-canvas border border-line text-ink text-sm rounded-md flex-wrap">
          <Badge variant="neutral">Draft</Badge>
          <Badge variant="ai">AI-assisted</Badge>
          <span>Summary generated with AI. Review and edit before publishing.</span>
        </div>
      )}

      {/* Card 1: Details */}
      <Card title="Details" className="space-y-4">
        {/* Category */}
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

        {/* Headline */}
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

        {/* Companies involved */}
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

        {/* Source name */}
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

        {/* Source link */}
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

        {/* Published date */}
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
      </Card>

      {/* Card 2: Source text */}
      <Card title="Source text" className="space-y-4">
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
            className="font-mono text-sm leading-relaxed"
          />
        </Field>
      </Card>

      {/* Card 3: Summary with AI controls in ai-soft bar */}
      <Card title="Summary" className="space-y-4">
        <div className="rounded-md border border-ai-line bg-ai-soft p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={isPending || !aiConfigured || !sourceText.trim()}
            >
              {pendingAction === "generating"
                ? "Generating…"
                : !aiConfigured
                ? "AI is not configured"
                : "Generate with AI"}
            </Button>

            {aiIsDemo && (
              <Badge variant="warning">
                Demo mode: placeholder output, not real AI
              </Badge>
            )}
          </div>
          {!sourceText.trim() && (
            <span className="text-xs text-ink-subtle">
              Paste article text above to enable AI summary
            </span>
          )}
        </div>

        {/* Reported facts (summary) */}
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

        {/* Why it matters (interpretation) */}
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
      </Card>

      {/* Action buttons bar */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-line flex-wrap">
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
            size="sm"
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
