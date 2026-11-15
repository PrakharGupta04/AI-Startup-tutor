"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInteractionAction } from "@/app/(app)/tutor/actions";
import { Button } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";

export interface DeleteInteractionButtonProps {
  id: number;
  className?: string;
}

export function DeleteInteractionButton({
  id,
  className = "",
}: DeleteInteractionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Delete this question, its answer and all notes? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteInteractionAction({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/tutor");
    });
  };

  return (
    <div className={`inline-block ${className}`}>
      {error && <ErrorMessage message={error} className="mb-2" />}
      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Delete question"}
      </Button>
    </div>
  );
}
