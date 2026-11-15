"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNoteAction } from "@/app/(app)/tutor/actions";
import { Button, Textarea } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";

export interface NoteFormProps {
  interactionId: number;
}

export function NoteForm({ interactionId }: NoteFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write a note.");
      return;
    }

    startTransition(async () => {
      const result = await addNoteAction({
        interactionId,
        body: trimmed,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setBody("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-line">
      {error && <ErrorMessage message={error} />}

      <div className="space-y-1">
        <label
          htmlFor="newNoteBody"
          className="block text-xs font-semibold text-ink uppercase tracking-wider"
        >
          Add a note for the group
        </label>
        <Textarea
          id="newNoteBody"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share context, examples, reflections, or follow-ups for the cohort..."
          disabled={isPending}
          maxLength={2000}
          required
        />
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isPending}
        >
          {isPending ? "Adding note…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
