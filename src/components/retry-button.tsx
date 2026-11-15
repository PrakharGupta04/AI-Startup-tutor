"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryAction } from "@/app/(app)/tutor/actions";
import { Button } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";

export interface RetryButtonProps {
  id: number;
  className?: string;
}

export function RetryButton({ id, className = "" }: RetryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRetry = () => {
    setError(null);
    startTransition(async () => {
      const result = await retryAction({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.status === "FAILED") {
        setError(
          result.data.errorMessage || "The retry attempt did not succeed."
        );
      }
      router.refresh();
    });
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      {error && <ErrorMessage message={error} className="text-xs p-2" />}
      <Button
        type="button"
        variant="secondary"
        onClick={handleRetry}
        disabled={isPending}
        className="text-xs min-h-[32px] px-2.5 py-1"
      >
        {isPending ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
