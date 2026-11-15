import React from "react";
import { AlertCircle } from "lucide-react";

export interface ErrorMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  className = "",
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={`rounded-md border border-danger/20 bg-danger-soft p-4 text-sm text-danger flex items-start gap-3 ${className}`}
    >
      <AlertCircle
        className="h-5 w-5 shrink-0 mt-0.5 text-danger"
        strokeWidth={1.75}
      />
      <div className="space-y-0.5">
        {title && <h4 className="font-semibold text-danger">{title}</h4>}
        <p>{message}</p>
      </div>
    </div>
  );
}
