import React from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import type { InteractionView } from "@/lib/data/tutor";
import { formatDateTime } from "@/lib/format";
import { Card, Badge, ButtonLink } from "@/components/ui";
import { Avatar } from "@/components/avatar";
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
    <Card className="hover:border-brand/40 transition-colors p-5 space-y-4">
      {/* Block 1: Question panel on canvas */}
      <div className="bg-canvas border border-line rounded-md p-4 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <Avatar name={interaction.authorName} size="sm" />
            <span className="font-semibold text-ink">
              {interaction.authorName}
            </span>
            <span>·</span>
            <span>{formatDateTime(interaction.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-ink-muted">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>
              {interaction.noteCount}{" "}
              {interaction.noteCount === 1 ? "note" : "notes"}
            </span>
          </div>
        </div>

        <div className="text-sm text-ink whitespace-pre-wrap line-clamp-4 leading-relaxed pt-1">
          {interaction.prompt}
        </div>
      </div>

      {/* Block 2: AI Answer panel on ai-soft */}
      {interaction.status === "COMPLETED" && (
        <div className="bg-ai-soft border border-ai-line rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Sparkles className="h-4 w-4 text-ai" strokeWidth={1.75} />
            <span className="font-semibold text-ai">AI Tutor</span>
            {interaction.model === "demo" ? (
              <Badge variant="warning">Demo</Badge>
            ) : (
              interaction.model && (
                <span className="text-xs text-ink-subtle font-mono">
                  {interaction.model}
                </span>
              )
            )}
          </div>

          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {previewResponse}
          </p>
        </div>
      )}

      {interaction.status === "FAILED" && (
        <div className="bg-danger-soft border border-danger/20 rounded-md p-4 text-xs text-danger space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">AI Tutor failed</span>
          </div>
          <p>
            {interaction.errorMessage ||
              "The request did not finish. Please retry."}
          </p>
        </div>
      )}

      {interaction.status === "PENDING" && (
        <div className="bg-canvas border border-line rounded-md p-4 text-xs text-ink-muted italic">
          Waiting for the AI…
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-line">
        <div>
          {isAuthor && isFailed && (
            <RetryButton id={interaction.id} />
          )}
        </div>

        <ButtonLink
          href={`/tutor/${interaction.id}`}
          variant="secondary"
          size="sm"
        >
          Open interaction
        </ButtonLink>
      </div>
    </Card>
  );
}
