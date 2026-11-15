// This module must never be imported from a "use client" file.

import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const placeholderCheck = (val: string) =>
  !val.startsWith("change-me") && !val.startsWith("replace-with");

const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string({ message: "is required" })
    .min(1, "must be a non-empty string"),
  DATABASE_AUTH_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
});

const appEnvSchema = databaseEnvSchema
  .extend({
    AUTH_SECRET: z
      .string({ message: "is required" })
      .min(32, "must be at least 32 characters")
      .refine(
        placeholderCheck,
        "must not use placeholder value (cannot start with 'change-me' or 'replace-with')"
      ),
    GROUP_NAME: z.preprocess(
      emptyToUndefined,
      z.string().default("My Group")
    ),
    GROUP_JOIN_CODE: z
      .string({ message: "is required" })
      .min(6, "must be at least 6 characters")
      .refine(
        placeholderCheck,
        "must not use placeholder value (cannot start with 'change-me' or 'replace-with')"
      ),
    INSTRUCTOR_CODE: z
      .string({ message: "is required" })
      .min(6, "must be at least 6 characters")
      .refine(
        placeholderCheck,
        "must not use placeholder value (cannot start with 'change-me' or 'replace-with')"
      ),
    AI_PROVIDER: z.preprocess(
      emptyToUndefined,
      z
        .enum(["gemini", "demo"], {
          message: "must be either 'gemini' or 'demo'",
        })
        .default("gemini")
    ),
    GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    GEMINI_MODEL: z.preprocess(
      emptyToUndefined,
      z.string().default("gemini-3.6-flash")
    ),
    NODE_ENV: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine((data) => data.GROUP_JOIN_CODE !== data.INSTRUCTOR_CODE, {
    message: "must differ from GROUP_JOIN_CODE",
    path: ["INSTRUCTOR_CODE"],
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (
        typeof data.GROUP_JOIN_CODE === "string" &&
        data.GROUP_JOIN_CODE.length < 12
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "must be at least 12 characters in production",
          path: ["GROUP_JOIN_CODE"],
        });
      }
      if (
        typeof data.INSTRUCTOR_CODE === "string" &&
        data.INSTRUCTOR_CODE.length < 12
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "must be at least 12 characters in production",
          path: ["INSTRUCTOR_CODE"],
        });
      }
    }
  });

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type AppEnv = z.infer<typeof appEnvSchema>;

function formatZodError(error: z.ZodError): Error {
  const messages = error.issues.map((issue) => {
    const field = issue.path.join(".") || "Configuration";
    return `${field}: ${issue.message}`;
  });
  return new Error(`Environment validation failed:\n${messages.join("\n")}`);
}

export function parseDatabaseEnv(
  source: Record<string, string | undefined> | NodeJS.ProcessEnv = process.env
): DatabaseEnv {
  const result = databaseEnvSchema.safeParse(source);
  if (!result.success) {
    throw formatZodError(result.error);
  }
  return result.data;
}

export function parseEnv(
  source: Record<string, string | undefined> | NodeJS.ProcessEnv = process.env
): AppEnv {
  const result = appEnvSchema.safeParse(source);
  if (!result.success) {
    throw formatZodError(result.error);
  }
  return result.data;
}

let cachedDatabaseEnv: DatabaseEnv | null = null;
let cachedAppEnv: AppEnv | null = null;

export function getDatabaseEnv(): DatabaseEnv {
  if (!cachedDatabaseEnv) {
    cachedDatabaseEnv = parseDatabaseEnv(process.env);
  }
  return cachedDatabaseEnv;
}

export function getEnv(): AppEnv {
  if (!cachedAppEnv) {
    cachedAppEnv = parseEnv(process.env);
  }
  return cachedAppEnv;
}
