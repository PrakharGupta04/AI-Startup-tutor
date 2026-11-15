import { z } from "zod";
import { ROLES } from "./constants";
import { AppError } from "./errors";
import { AI_INPUT_LIMITS } from "./ai/types";

const emailSchema = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email("Please enter a valid email address.")
      .max(254, "Email must be at most 254 characters.")
  );

const nameSchema = z
  .string({ message: "Name is required" })
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name must be at most 100 characters.");

const passwordSchema = z
  .string({ message: "Password is required" })
  .min(8, "Password must be 8–72 characters.")
  .max(72, "Password must be 8–72 characters.")
  .refine(
    (val) => Buffer.byteLength(val, "utf8") <= 72,
    "Password must be at most 72 bytes."
  );

const codeSchema = z
  .string({ message: "Registration code is required" })
  .trim()
  .min(1, "Registration code is required.");

const userIdSchema = z.union([
  z.number().int().positive("Invalid user ID."),
  z
    .string()
    .regex(/^\d+$/, "Invalid user ID.")
    .transform(Number)
    .pipe(z.number().int().positive("Invalid user ID.")),
]);

const isActiveSchema = z.union([
  z.boolean(),
  z
    .enum(["true", "false"], { message: "Invalid status value." })
    .transform((val) => val === "true"),
]);

const roleSchema = z.enum(ROLES, {
  message: "Role must be either MEMBER or INSTRUCTOR.",
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  code: codeSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const addMemberSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  userId: userIdSchema,
  newPassword: passwordSchema,
});

export const setActiveSchema = z.object({
  userId: userIdSchema,
  isActive: isActiveSchema,
});

export const setRoleSchema = z.object({
  userId: userIdSchema,
  role: roleSchema,
});

const calendarDateSchema = z
  .string({ message: "Enter a valid date." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((val) => {
    const parts = val.split("-").map(Number);
    if (parts.length !== 3) return false;
    const [year, month, day] = parts;
    const d = new Date(Date.UTC(year, month - 1, day));
    return (
      d.getUTCFullYear() === year &&
      d.getUTCMonth() === month - 1 &&
      d.getUTCDate() === day
    );
  }, "Enter a valid date.");

export const reflectionSaveSchema = z.object({
  id: z
    .union([
      z.number().int().positive("Invalid reflection ID."),
      z
        .string()
        .regex(/^\d+$/, "Invalid reflection ID.")
        .transform(Number)
        .pipe(z.number().int().positive("Invalid reflection ID.")),
    ])
    .optional(),
  sessionTitle: z
    .string({ message: "Session title is required." })
    .trim()
    .min(1, "Session title is required.")
    .max(
      AI_INPUT_LIMITS.sessionTitle,
      `Session title must be at most ${AI_INPUT_LIMITS.sessionTitle} characters.`
    ),
  sessionDate: calendarDateSchema,
  rawNotes: z
    .string()
    .max(
      AI_INPUT_LIMITS.rawNotes,
      `Raw notes must be at most ${AI_INPUT_LIMITS.rawNotes} characters.`
    )
    .default(""),
  concepts: z
    .string()
    .max(5000, "Concepts must be at most 5000 characters.")
    .default(""),
  takeaways: z
    .string()
    .max(5000, "Takeaways must be at most 5000 characters.")
    .default(""),
  observations: z
    .string()
    .max(5000, "Observations must be at most 5000 characters.")
    .default(""),
  insights: z
    .string()
    .max(5000, "Insights must be at most 5000 characters.")
    .default(""),
  openQuestions: z
    .string()
    .max(5000, "Open questions must be at most 5000 characters.")
    .default(""),
});

export const reflectionIdSchema = z.object({
  id: z.union([
    z.number().int().positive("Invalid reflection ID."),
    z
      .string()
      .regex(/^\d+$/, "Invalid reflection ID.")
      .transform(Number)
      .pipe(z.number().int().positive("Invalid reflection ID.")),
  ]),
});

export const reflectionListSchema = z.object({
  page: z
    .preprocess((val) => {
      if (typeof val === "number" && !isNaN(val) && val >= 1) {
        return Math.floor(val);
      }
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 1) {
          return parsed;
        }
      }
      return 1;
    }, z.number().int().min(1).default(1))
    .default(1),
  scope: z
    .preprocess((val) => {
      if (val === "mine") return "mine";
      return "all";
    }, z.enum(["all", "mine"]).default("all"))
    .default("all"),
});

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    throw new AppError(
      "VALIDATION",
      "Please correct the highlighted fields.",
      fieldErrors
    );
  }
  return result.data;
}
