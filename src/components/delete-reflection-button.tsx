"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteReflectionAction } from "@/app/(app)/reflections/actions";
import { Button } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";

export interface DeleteReflectionButtonProps {
  id: number;
  className?: string;
}

export function DeleteReflectionButton({
  id,
  className = "",
}: DeleteReflectionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Delete this reflection? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteReflectionAction({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/reflections");
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
        {isPending ? "Deleting…" : "Delete reflection"}
      </Button>
    </div>
  );
}
