import { z } from "zod";
import { ROLES } from "./constants";
import { AppError } from "./errors";

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
