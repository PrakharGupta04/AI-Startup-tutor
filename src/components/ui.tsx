import React from "react";
import Link, { type LinkProps } from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "md" | "sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function getButtonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = ""
): string {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses: Record<ButtonSize, string> = {
    md: "min-h-[40px] px-4 py-2 text-sm",
    sm: "min-h-[32px] px-3 py-1 text-xs",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-brand text-white hover:bg-brand-hover",
    secondary: "bg-surface border border-line text-ink hover:bg-canvas",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "text-ink-muted hover:bg-brand-soft",
  };

  return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={getButtonClasses(variant, size, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export interface ButtonLinkProps
  extends LinkProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={getButtonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-ink-muted">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`block w-full min-h-[40px] px-3 py-2 rounded-md border border-line bg-surface text-[15px] text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`block w-full min-h-[96px] px-3 py-2 rounded-md border border-line bg-surface text-[15px] text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select
      className={`block w-full min-h-[40px] px-3 py-2 rounded-md border border-line bg-surface text-[15px] text-ink focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export interface CardProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, className = "", children }: CardProps) {
  return (
    <div
      className={`bg-surface border border-line rounded-lg p-5 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
      )}
      {children}
    </div>
  );
}

export type BadgeVariant =
  | "neutral"
  | "info"
  | "ai"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  className = "",
  children,
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    neutral: "bg-canvas text-ink-muted border-line",
    info: "bg-brand-soft text-brand border-brand/20",
    ai: "bg-ai-soft text-ai border-ai-line",
    success: "bg-success-soft text-success border-success/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    danger: "bg-danger-soft text-danger border-danger/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
