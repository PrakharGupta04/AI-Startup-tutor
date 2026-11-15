import { describe, it, expect } from "vitest";
import { parseEnv, parseDatabaseEnv } from "@/lib/env";

describe("env parser", () => {
  const validBaseEnv = {
    DATABASE_URL: "file:./data/app.db",
    AUTH_SECRET: "12345678901234567890123456789012",
    GROUP_JOIN_CODE: "member-code-123",
    INSTRUCTOR_CODE: "instructor-code-456",
  };

  it("parses a complete valid object and applies defaults", () => {
    const parsed = parseEnv(validBaseEnv);
    expect(parsed.DATABASE_URL).toBe("file:./data/app.db");
    expect(parsed.DATABASE_AUTH_TOKEN).toBeUndefined();
    expect(parsed.AUTH_SECRET).toBe("12345678901234567890123456789012");
    expect(parsed.GROUP_NAME).toBe("My Group");
    expect(parsed.GROUP_JOIN_CODE).toBe("member-code-123");
    expect(parsed.INSTRUCTOR_CODE).toBe("instructor-code-456");
    expect(parsed.AI_PROVIDER).toBe("gemini");
    expect(parsed.GEMINI_API_KEY).toBeUndefined();
    expect(parsed.GEMINI_MODEL).toBe("gemini-3.6-flash");
  });

  it("throws when AUTH_SECRET is missing or 10 characters", () => {
    const withoutSecret: Record<string, string> = { ...validBaseEnv };
    delete withoutSecret.AUTH_SECRET;
    expect(() => parseEnv(withoutSecret)).toThrow(/AUTH_SECRET/);

    expect(() =>
      parseEnv({
        ...validBaseEnv,
        AUTH_SECRET: "short12345",
      })
    ).toThrow(/AUTH_SECRET/);
  });

  it("throws when join and instructor codes are identical", () => {
    expect(() =>
      parseEnv({
        ...validBaseEnv,
        GROUP_JOIN_CODE: "same-code-123",
        INSTRUCTOR_CODE: "same-code-123",
      })
    ).toThrow(/INSTRUCTOR_CODE/);
  });

  it("throws when code starts with change-me... or secret starts with replace-with...", () => {
    expect(() =>
      parseEnv({
        ...validBaseEnv,
        GROUP_JOIN_CODE: "change-me-later",
      })
    ).toThrow(/GROUP_JOIN_CODE/);

    expect(() =>
      parseEnv({
        ...validBaseEnv,
        INSTRUCTOR_CODE: "change-me-instructor",
      })
    ).toThrow(/INSTRUCTOR_CODE/);

    expect(() =>
      parseEnv({
        ...validBaseEnv,
        AUTH_SECRET: "replace-with-a-random-secret-at-least-32-chars",
      })
    ).toThrow(/AUTH_SECRET/);
  });

  it("accepts empty GEMINI_API_KEY as undefined", () => {
    const parsed = parseEnv({
      ...validBaseEnv,
      GEMINI_API_KEY: "",
    });
    expect(parsed.GEMINI_API_KEY).toBeUndefined();
  });

  it("throws on invalid AI_PROVIDER", () => {
    expect(() =>
      parseEnv({
        ...validBaseEnv,
        AI_PROVIDER: "openai",
      })
    ).toThrow(/AI_PROVIDER/);
  });

  it("ensures the thrown error message does not contain the secret value", () => {
    const sensitiveValue = "SUPER_SECRET_LEAK_TEST_VALUE_XYZ";
    try {
      parseEnv({
        ...validBaseEnv,
        AUTH_SECRET: sensitiveValue, // only 32 chars if we pad it, let's make it fail
      });
      // In case it's 32 chars: sensitiveValue is 32 chars. Let's make it start with replace-with or be short
    } catch {
      // ignore
    }

    const failingSecret = "sensitive-value-that-is-short";
    let thrownMessage = "";
    try {
      parseEnv({
        ...validBaseEnv,
        AUTH_SECRET: failingSecret,
      });
    } catch (err) {
      thrownMessage = (err as Error).message;
    }
    expect(thrownMessage).toContain("AUTH_SECRET");
    expect(thrownMessage).not.toContain(failingSecret);
  });

  it("parses database env with only DATABASE_URL", () => {
    const parsed = parseDatabaseEnv({
      DATABASE_URL: "file:./data/app.db",
    });
    expect(parsed.DATABASE_URL).toBe("file:./data/app.db");
    expect(parsed.DATABASE_AUTH_TOKEN).toBeUndefined();
  });

  describe("production code length rules", () => {
    const shortJoinCode = "member8c";
    const shortInstCode = "instr8ch";
    const valid12JoinCode = "member-code-12";
    const valid12InstCode = "instructor-456";

    it("throws in production when join or instructor code is 8 characters", () => {
      let thrownJoin = "";
      try {
        parseEnv({
          ...validBaseEnv,
          NODE_ENV: "production",
          GROUP_JOIN_CODE: shortJoinCode,
          INSTRUCTOR_CODE: valid12InstCode,
        });
      } catch (err) {
        thrownJoin = (err as Error).message;
      }
      expect(thrownJoin).toContain("GROUP_JOIN_CODE");
      expect(thrownJoin).not.toContain(shortJoinCode);

      let thrownInst = "";
      try {
        parseEnv({
          ...validBaseEnv,
          NODE_ENV: "production",
          GROUP_JOIN_CODE: valid12JoinCode,
          INSTRUCTOR_CODE: shortInstCode,
        });
      } catch (err) {
        thrownInst = (err as Error).message;
      }
      expect(thrownInst).toContain("INSTRUCTOR_CODE");
      expect(thrownInst).not.toContain(shortInstCode);
    });

    it("parses in production when both codes are 12+ characters", () => {
      const parsed = parseEnv({
        ...validBaseEnv,
        NODE_ENV: "production",
        GROUP_JOIN_CODE: valid12JoinCode,
        INSTRUCTOR_CODE: valid12InstCode,
      });
      expect(parsed.GROUP_JOIN_CODE).toBe(valid12JoinCode);
      expect(parsed.INSTRUCTOR_CODE).toBe(valid12InstCode);
    });

    it("parses 8-character codes when NODE_ENV is not production", () => {
      const parsedDev = parseEnv({
        ...validBaseEnv,
        NODE_ENV: "development",
        GROUP_JOIN_CODE: shortJoinCode,
        INSTRUCTOR_CODE: shortInstCode,
      });
      expect(parsedDev.GROUP_JOIN_CODE).toBe(shortJoinCode);
      expect(parsedDev.INSTRUCTOR_CODE).toBe(shortInstCode);

      const parsedNone = parseEnv({
        ...validBaseEnv,
        GROUP_JOIN_CODE: shortJoinCode,
        INSTRUCTOR_CODE: shortInstCode,
      });
      expect(parsedNone.GROUP_JOIN_CODE).toBe(shortJoinCode);
      expect(parsedNone.INSTRUCTOR_CODE).toBe(shortInstCode);
    });
  });
});
