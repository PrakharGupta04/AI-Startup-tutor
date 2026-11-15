import Link from "next/link";
import { notFound } from "next/navigation";
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
          className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
        >
          ← Back to the log
        </Link>
      </div>

      {/* Question card */}
      <Card className="p-6">
        <div className="text-xs text-slate-500 mb-2">
          Asked by <span className="font-semibold text-slate-700">{interaction.authorName}</span> ·{" "}
          {formatDateTime(new Date(interaction.createdAt))}
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-3">Question</h1>
        <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
          {interaction.prompt}
        </div>
      </Card>

      {/* AI Tutor card */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="info">AI Tutor</Badge>
            {interaction.model === "demo" ? (
              <Badge variant="warning">Demo</Badge>
            ) : interaction.model ? (
              <span className="text-xs text-slate-500">{interaction.model}</span>
            ) : null}
          </div>
          {interaction.completedAt && (
            <span className="text-xs text-slate-400">
              Answered {formatDateTime(new Date(interaction.completedAt))}
            </span>
          )}
        </div>

        {interaction.status === "COMPLETED" && (
          <div className="space-y-4">
            <Markdown>{interaction.response || ""}</Markdown>
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              AI answers can contain mistakes. Verify important facts.
            </p>
          </div>
        )}

        {interaction.status === "FAILED" && (
          <div className="space-y-3">
            <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-800">
              <p className="font-medium">The AI tutor could not complete this request.</p>
              <p className="mt-1 text-xs text-rose-700">
                {interaction.errorMessage || "Something went wrong. Please try again."}
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
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-600">
            Waiting for the AI…
          </div>
        )}
      </Card>

      {/* Group notes card */}
      <Card className="p-6 bg-slate-50 border-slate-300">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Group notes</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Added by members. These are not part of the AI&apos;s answer.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {interaction.notes.length === 0 ? (
            <p className="text-sm italic text-slate-400">No notes yet.</p>
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

      {/* Instructor actions */}
      {isInstructor && (
        <Card className="p-4 border-rose-200 bg-rose-50/50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Instructor controls
            </h3>
            <p className="text-xs text-slate-600">
              Delete this question, its AI answer, and all group notes permanently.
            </p>
          </div>
          <DeleteInteractionButton id={interaction.id} />
        </Card>
      )}
    </div>
  );
}
