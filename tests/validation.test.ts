import { describe, it, expect } from "vitest";
import {
  parseInput,
  registerSchema,
  setActiveSchema,
  setRoleSchema,
} from "@/lib/validation";
import { AppError } from "@/lib/errors";

describe("validation and parseInput", () => {
  it("trims and lowercases valid email", () => {
    const parsed = parseInput(registerSchema, {
      name: "Alice Smith",
      email: "  ALICE@Example.COM  ",
      password: "validPassword123",
      code: "group-code-123",
    });
    expect(parsed.email).toBe("alice@example.com");
    expect(parsed.name).toBe("Alice Smith");
  });

  it("rejects 7-character password and accepts 8-character password", () => {
    expect(() =>
      parseInput(registerSchema, {
        name: "Alice Smith",
        email: "alice@example.com",
        password: "1234567",
        code: "group-code-123",
      })
    ).toThrow(AppError);

    const valid = parseInput(registerSchema, {
      name: "Alice Smith",
      email: "alice@example.com",
      password: "12345678",
      code: "group-code-123",
    });
    expect(valid.password).toBe("12345678");
  });

  it("rejects 73-character password", () => {
    const password73 = "a".repeat(73);
    expect(() =>
      parseInput(registerSchema, {
        name: "Alice Smith",
        email: "alice@example.com",
        password: password73,
        code: "group-code-123",
      })
    ).toThrow(AppError);
  });

  it("converts userId '5' to number 5", () => {
    const parsed = parseInput(setActiveSchema, {
      userId: "5",
      isActive: "true",
    });
    expect(parsed.userId).toBe(5);
  });

  it("converts isActive 'false' to boolean false", () => {
    const parsed = parseInput(setActiveSchema, {
      userId: 5,
      isActive: "false",
    });
    expect(parsed.isActive).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(() =>
      parseInput(setRoleSchema, {
        userId: 1,
        role: "ADMIN",
      })
    ).toThrow(AppError);
  });

  it("carries fieldErrors on parseInput failure", () => {
    try {
      parseInput(registerSchema, {
        name: "",
        email: "invalid-email",
        password: "short",
        code: "",
      });
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("VALIDATION");
      expect(appErr.fieldErrors).toBeDefined();
      expect(appErr.fieldErrors?.name).toBeDefined();
      expect(appErr.fieldErrors?.email).toBeDefined();
      expect(appErr.fieldErrors?.password).toBeDefined();
      expect(appErr.fieldErrors?.code).toBeDefined();
    }
  });
});
