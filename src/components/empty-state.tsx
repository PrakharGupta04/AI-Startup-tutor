import React from "react";
import { type LucideIcon } from "lucide-react";
import { ButtonLink } from "./ui";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-lg border-2 border-dashed border-line p-8 text-center bg-surface/50 ${className}`}
    >
      {Icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      {action && (
        <div className="mt-4">
          <ButtonLink href={action.href} variant="primary">
            {action.label}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
