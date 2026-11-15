import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseInput,
  registerSchema,
  setActiveSchema,
  setRoleSchema,
  maxSessionDate,
  reflectionSaveSchema,
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

  describe("future-date validation and maxSessionDate", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-15T10:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("maxSessionDate returns UTC date plus 1 day (2026-11-16)", () => {
      expect(maxSessionDate()).toBe("2026-11-16");
    });

    it("reflectionSaveSchema accepts today (2026-11-15), tomorrow (2026-11-16), and a past date", () => {
      const baseInput = {
        sessionTitle: "Cohort Session",
        rawNotes: "Notes",
        concepts: "Concepts",
        takeaways: "Takeaways",
        observations: "Obs",
        insights: "Insights",
        openQuestions: "Questions",
      };

      const todayParsed = parseInput(reflectionSaveSchema, {
        ...baseInput,
        sessionDate: "2026-11-15",
      });
      expect(todayParsed.sessionDate).toBe("2026-11-15");

      const tomorrowParsed = parseInput(reflectionSaveSchema, {
        ...baseInput,
        sessionDate: "2026-11-16",
      });
      expect(tomorrowParsed.sessionDate).toBe("2026-11-16");

      const pastParsed = parseInput(reflectionSaveSchema, {
        ...baseInput,
        sessionDate: "2026-01-15",
      });
      expect(pastParsed.sessionDate).toBe("2026-01-15");
    });

    it("reflectionSaveSchema rejects day after tomorrow (2026-11-17) with specific message", () => {
      try {
        parseInput(reflectionSaveSchema, {
          sessionTitle: "Future Session",
          sessionDate: "2026-11-17",
          rawNotes: "",
          concepts: "",
          takeaways: "",
          observations: "",
          insights: "",
          openQuestions: "",
        });
        expect.unreachable("Should have rejected 2026-11-17");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appErr = error as AppError;
        expect(appErr.code).toBe("VALIDATION");
        expect(appErr.fieldErrors?.sessionDate).toBe(
          "The session date cannot be in the future."
        );
      }
    });
  });
});
