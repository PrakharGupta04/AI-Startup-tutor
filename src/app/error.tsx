"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error without printing potential secrets
    console.error("Application error:", error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-ink">
          Something went wrong
        </h2>
        <p className="text-sm text-ink-muted">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <ButtonLink href="/dashboard" variant="secondary">
            Return to dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
