import React from "react";
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
      {/* Header: Category Badge and Headline */}
      <div className="space-y-2">
        <div>
          <Badge variant="neutral">{categoryLabel}</Badge>
        </div>
        <h2 className="text-xl font-bold text-slate-900 leading-snug">
          {item.headline}
        </h2>
      </div>

      {/* Meta line: Companies and Published Date */}
      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
        {item.companies ? (
          <>
            <span className="font-medium text-slate-700">{item.companies}</span>
            <span>·</span>
            <span>{dateText}</span>
          </>
        ) : (
          <span>{dateText}</span>
        )}
      </div>

      {/* Source line with link and hostname */}
      <div className="text-sm text-slate-600">
        <span className="text-slate-500">Source: </span>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {item.sourceName}
        </a>
        {hostname && (
          <span className="ml-1 text-xs text-slate-400">({hostname})</span>
        )}
      </div>

      {/* Block 1: Reported (from the source) */}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Reported (from the source)
        </h3>
        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
          {item.factSummary}
        </p>
      </div>

      {/* Block 2: Why it matters (interpretation) */}
      <div className="rounded-md border border-indigo-200 bg-indigo-50/70 p-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-900">
            Why it matters (interpretation)
          </h3>
          {item.aiAssisted && <Badge variant="info">AI-assisted</Badge>}
        </div>
        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
          {item.whyItMatters}
        </p>
      </div>
    </Card>
  );
}
