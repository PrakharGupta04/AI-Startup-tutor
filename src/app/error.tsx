"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <Button variant="primary" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
