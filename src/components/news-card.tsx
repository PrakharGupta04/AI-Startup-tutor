import React from "react";
import { ExternalLink } from "lucide-react";
import type { NewsPublicView } from "@/lib/data/news";
import { NEWS_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, Badge } from "@/components/ui";

export interface NewsCardProps {
  item: NewsPublicView;
}

export function NewsCard({ item }: NewsCardProps) {
  let hostname = "";
  try {
    hostname = new URL(item.sourceUrl).hostname;
  } catch {
    hostname = "";
  }

  const dateText = item.publishedOn
    ? `Published ${formatDate(item.publishedOn)}`
    : "Date not given";

  const categoryLabel = NEWS_CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <Card className="p-6 space-y-4">
      {/* Category Badge & Serif Headline */}
      <div className="space-y-2">
        <div>
          <Badge variant="neutral">{categoryLabel}</Badge>
        </div>
        <h2 className="font-serif text-xl font-semibold text-ink leading-snug">
          {item.headline}
        </h2>
      </div>

      {/* Meta line: Companies and Published Date */}
      <div className="text-xs text-ink-muted flex items-center gap-2 flex-wrap">
        {item.companies ? (
          <>
            <span className="font-medium text-ink">{item.companies}</span>
            <span>·</span>
            <span>{dateText}</span>
          </>
        ) : (
          <span>{dateText}</span>
        )}
      </div>

      {/* Source line with link and external-link icon */}
      <div className="text-sm text-ink-muted flex items-center gap-1.5 flex-wrap">
        <span>Source:</span>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>{item.sourceName}</span>
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
        </a>
        {hostname && (
          <span className="text-xs text-ink-subtle">({hostname})</span>
        )}
      </div>

      {/* Two blocks side by side from md (stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Block 1: Reported (from the source) on canvas panel */}
        <div className="rounded-md border border-line bg-canvas p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Reported (from the source)
          </h3>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {item.factSummary}
          </p>
        </div>

        {/* Block 2: Why it matters (interpretation) on ai-soft panel */}
        <div className="rounded-md border border-ai-line bg-ai-soft p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ai">
              Why it matters (interpretation)
            </h3>
            {item.aiAssisted && <Badge variant="ai">AI-assisted</Badge>}
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {item.whyItMatters}
          </p>
        </div>
      </div>
    </Card>
  );
}
