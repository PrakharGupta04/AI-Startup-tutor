import { isAiError } from "./ai/errors";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: AppErrorCode,
    message: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function success<T = null>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure<T = null>(
  error: string,
  fieldErrors?: Record<string, string>
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

export function toFailure<T = null>(e: unknown): ActionResult<T> {
  if (e instanceof AppError) {
    return failure<T>(e.message, e.fieldErrors);
  }
  if (isAiError(e)) {
    return failure<T>(e.message);
  }
  console.error("Unhandled error:", e);
  return failure<T>("Something went wrong. Please try again.");
}
