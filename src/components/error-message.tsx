import React from "react";

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
      className={`rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 ${className}`}
    >
      {title && <h4 className="font-semibold mb-1 text-rose-900">{title}</h4>}
      <p>{message}</p>
    </div>
  );
}
