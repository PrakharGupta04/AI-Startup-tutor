import type { Role } from "./constants";
import { AppError } from "./errors";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

export function isInstructor(user: AuthUser): boolean {
  return user.role === "INSTRUCTOR";
}

export function assertInstructor(user: AuthUser): void {
  if (!isInstructor(user)) {
    throw new AppError("FORBIDDEN", "Only instructors can do this.");
  }
}
