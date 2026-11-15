import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${className}`}
    >
      <div>
        <h1 className="font-serif text-[30px] font-semibold tracking-tight text-ink leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
