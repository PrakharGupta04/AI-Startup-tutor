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
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-slate-200">
      {error && <ErrorMessage message={error} />}

      <div className="space-y-1">
        <label
          htmlFor="newNoteBody"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          Add a note for the group
        </label>
        <Textarea
          id="newNoteBody"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your perspective, context, real-world examples, or related questions..."
          disabled={isPending}
          maxLength={2000}
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="secondary"
          disabled={isPending}
          className="text-xs"
        >
          {isPending ? "Adding…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
