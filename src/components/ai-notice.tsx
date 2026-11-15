import React from "react";

export interface AiNoticeProps {
  className?: string;
}

export function AiNotice({ className = "" }: AiNoticeProps) {
  return (
    <div
      role="note"
      className={`rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 ${className}`}
    >
      <p>
        <span className="font-semibold">Notice:</span> Do not enter personal or
        confidential information. AI output can contain mistakes: always review
        it before submitting.
      </p>
    </div>
  );
}
