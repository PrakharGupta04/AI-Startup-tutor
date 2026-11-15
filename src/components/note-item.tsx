"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNoteAction, deleteNoteAction } from "@/app/(app)/tutor/actions";
import { Button, Textarea, Badge } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";
import { formatDateTime } from "@/lib/format";

export interface NoteItemProps {
  note: {
    id: number;
    authorName: string;
    authorRole: "MEMBER" | "INSTRUCTOR";
    body: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  canEdit: boolean;
  canDelete: boolean;
}

export function NoteItem({ note, canEdit, canDelete }: NoteItemProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdited =
    new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime();

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write a note.");
      return;
    }

    startTransition(async () => {
      const result = await updateNoteAction({
        noteId: note.id,
        body: trimmed,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setIsEditing(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteNoteAction({ noteId: note.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="p-3 bg-white rounded border border-slate-200 text-sm space-y-2">
      {error && <ErrorMessage message={error} />}

      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800">{note.authorName}</span>
          {note.authorRole === "INSTRUCTOR" && (
            <Badge variant="info">Instructor</Badge>
          )}
          <span>{formatDateTime(new Date(note.createdAt))}</span>
          {isEdited && <span className="italic text-slate-400">(edited)</span>}
        </div>

        {!isEditing && (canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setBody(note.body);
                  setIsEditing(true);
                  setError(null);
                }}
                disabled={isPending}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-2 pt-1">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            disabled={isPending}
            maxLength={2000}
            required
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBody(note.body);
                setIsEditing(false);
                setError(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save note"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-slate-800 whitespace-pre-wrap">{note.body}</p>
      )}
    </div>
  );
}
