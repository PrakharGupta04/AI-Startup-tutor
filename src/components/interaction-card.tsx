import React from "react";
import Link from "next/link";
import type { InteractionView } from "@/lib/data/tutor";
import { formatDateTime } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { RetryButton } from "@/components/retry-button";

export interface InteractionCardProps {
  interaction: InteractionView;
  currentUserId: number;
}

export function InteractionCard({
  interaction,
  currentUserId,
}: InteractionCardProps) {
  const isAuthor = interaction.authorId === currentUserId;
  const isFailed = interaction.status === "FAILED";

  const rawResponse = interaction.response || "";
  const previewResponse =
    rawResponse.length > 240 ? rawResponse.slice(0, 240) + "…" : rawResponse;

  return (
    <Card className="hover:border-slate-300 transition-colors">
      <div className="space-y-3">
        {/* Header: Author & timestamp */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-slate-500 border-b border-slate-100 pb-2">
          <div>
            Asked by{" "}
            <span className="font-semibold text-slate-800">
              {interaction.authorName}
            </span>{" "}
            · {formatDateTime(interaction.createdAt)}
          </div>
          <div>
            <span className="font-medium text-slate-600">
              {interaction.noteCount}{" "}
              {interaction.noteCount === 1 ? "note" : "notes"}
            </span>
          </div>
        </div>

        {/* Question block */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Question
          </span>
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap line-clamp-4 leading-relaxed">
            {interaction.prompt}
          </div>
        </div>

        {/* AI Tutor block */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI Tutor
            </span>
            {interaction.status === "COMPLETED" && (
              <>
                <Badge variant="info">AI Tutor</Badge>
                {interaction.model === "demo" ? (
                  <Badge variant="warning">Demo</Badge>
                ) : (
                  interaction.model && (
                    <span className="text-xs text-slate-400 font-mono">
                      {interaction.model}
                    </span>
                  )
                )}
              </>
            )}
          </div>

          {interaction.status === "COMPLETED" && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {previewResponse}
            </p>
          )}

          {interaction.status === "FAILED" && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <p className="font-medium">
                {interaction.errorMessage ||
                  "The request did not finish. Please retry."}
              </p>
            </div>
          )}

          {interaction.status === "PENDING" && (
            <p className="text-sm italic text-slate-500">
              Waiting for the AI…
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            {isAuthor && isFailed && (
              <RetryButton id={interaction.id} />
            )}
          </div>

          <Link
            href={`/tutor/${interaction.id}`}
            className="inline-flex items-center justify-center min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Open
          </Link>
        </div>
      </div>
    </Card>
  );
}
