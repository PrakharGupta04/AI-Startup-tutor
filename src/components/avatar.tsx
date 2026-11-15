import React from "react";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | number;
  className?: string;
}

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  let sizeClasses = "h-8 w-8 text-sm";
  if (size === "sm") sizeClasses = "h-6 w-6 text-xs";
  if (size === "lg") sizeClasses = "h-10 w-10 text-base";
  const inlineStyle =
    typeof size === "number"
      ? { width: size, height: size, fontSize: size * 0.45 }
      : undefined;

  return (
    <div
      style={inlineStyle}
      className={`inline-flex items-center justify-center rounded-full bg-brand-soft text-brand font-semibold select-none shrink-0 ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
