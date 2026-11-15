import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getInteraction } from "@/lib/data/tutor";
import { AppError } from "@/lib/errors";
import { Card, Badge } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { RetryButton } from "@/components/retry-button";
import { NoteItem } from "@/components/note-item";
import { NoteForm } from "@/components/note-form";
import { DeleteInteractionButton } from "@/components/delete-interaction-button";
import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";

export const instant = false;

interface TutorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TutorDetailPage(props: TutorDetailPageProps) {
  const user = await requireUser();
  const { id: rawId } = await props.params;

  const id = parseInt(rawId, 10);
  if (isNaN(id) || !/^\d+$/.test(rawId) || id <= 0) {
    notFound();
  }

  let interaction;
  try {
    interaction = await getInteraction(getDb(), user, id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const isAuthor = interaction.authorId === user.id;
  const isInstructor = user.role === "INSTRUCTOR";

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <Link
          href="/tutor"
          className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1 mb-2"
        >
          ← Back to the log
        </Link>
      </div>

      {/* Block 1: Question card with canvas panel */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-xs text-ink-muted">
          <Avatar name={interaction.authorName} size="sm" />
          <span className="font-semibold text-ink">
            {interaction.authorName}
          </span>
          <span>·</span>
          <span>{formatDateTime(new Date(interaction.createdAt))}</span>
        </div>

        <div className="bg-canvas border border-line rounded-md p-4 text-[15px] text-ink whitespace-pre-wrap leading-relaxed">
          {interaction.prompt}
        </div>
      </Card>

      {/* Block 2: AI Answer on ai-soft panel */}
      <div className="rounded-lg border border-ai-line bg-ai-soft p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ai" strokeWidth={1.75} />
            <span className="font-semibold text-ai">AI Tutor</span>
            {interaction.model === "demo" ? (
              <Badge variant="warning">Demo</Badge>
            ) : interaction.model ? (
              <span className="text-xs text-ink-subtle font-mono">
                {interaction.model}
              </span>
            ) : null}
          </div>
          {interaction.completedAt && (
            <span className="text-xs text-ink-subtle">
              Answered {formatDateTime(new Date(interaction.completedAt))}
            </span>
          )}
        </div>

        {interaction.status === "COMPLETED" && (
          <div className="space-y-4">
            <Markdown>{interaction.response || ""}</Markdown>
            <p className="text-xs text-ink-subtle pt-3 border-t border-ai-line/60">
              AI answers can contain mistakes. Verify important facts.
            </p>
          </div>
        )}

        {interaction.status === "FAILED" && (
          <div className="space-y-3">
            <div className="p-4 rounded-md bg-danger-soft border border-danger/20 text-sm text-danger">
              <p className="font-semibold">
                The AI tutor could not complete this request.
              </p>
              <p className="mt-1 text-xs">
                {interaction.errorMessage ||
                  "Something went wrong. Please try again."}
              </p>
            </div>
            {isAuthor && (
              <div className="pt-2">
                <RetryButton id={interaction.id} />
              </div>
            )}
          </div>
        )}

        {interaction.status === "PENDING" && (
          <div className="p-4 rounded-md bg-canvas border border-line text-sm text-ink-muted italic">
            Waiting for the AI…
          </div>
        )}
      </div>

      {/* Block 3: Group notes card with border-l-4 border-brand */}
      <Card className="p-6 border-l-4 border-l-brand space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand" strokeWidth={1.75} />
              <span>Group notes</span>
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Added by members. These are not part of the AI&apos;s answer.
            </p>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            {interaction.notes.length}{" "}
            {interaction.notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {interaction.notes.length === 0 ? (
            <p className="text-sm italic text-ink-subtle">No notes yet.</p>
          ) : (
            interaction.notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                canEdit={note.authorId === user.id}
                canDelete={note.authorId === user.id || isInstructor}
              />
            ))
          )}
        </div>

        <NoteForm interactionId={interaction.id} />
      </Card>

      {/* Instructor controls */}
      {isInstructor && (
        <Card className="p-4 border-line bg-surface flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Instructor controls
            </h3>
            <p className="text-xs text-ink-muted">
              Delete this question, its AI answer, and all group notes permanently.
            </p>
          </div>
          <DeleteInteractionButton id={interaction.id} />
        </Card>
      )}
    </div>
  );
}
