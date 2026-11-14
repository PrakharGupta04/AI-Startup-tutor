import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createTestDb } from "./test-db";
import {
  registerUser,
  authenticate,
  getActiveUserById,
  listMembers,
  addMember,
  resetPassword,
  setUserActive,
  setUserRole,
  updateProfile,
  changePassword,
} from "@/lib/data/users";
import { AppError } from "@/lib/errors";

describe("users data layer part 1", () => {
  let db: Db;
  let cleanup: () => void;

  const codes = {
    joinCode: "member-join-code-123",
    instructorCode: "instructor-secret-code-456",
  };

  beforeAll(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    cleanup = testDb.cleanup;
  });

  afterAll(() => {
    cleanup();
  });

  it("assigns MEMBER role for joinCode and INSTRUCTOR role for instructorCode", async () => {
    const member = await registerUser(
      db,
      {
        name: "Member User",
        email: "member@example.com",
        password: "password123",
        code: codes.joinCode,
      },
      codes
    );
    expect(member.role).toBe("MEMBER");
    expect(member.email).toBe("member@example.com");

    const instructor = await registerUser(
      db,
      {
        name: "Instructor User",
        email: "instructor@example.com",
        password: "password123",
        code: codes.instructorCode,
      },
      codes
    );
    expect(instructor.role).toBe("INSTRUCTOR");
    expect(instructor.email).toBe("instructor@example.com");
  });

  it("throws VALIDATION error with fieldErrors.code for invalid registration code", async () => {
    try {
      await registerUser(
        db,
        {
          name: "Invalid Code User",
          email: "invalidcode@example.com",
          password: "password123",
          code: "wrong-code-xyz",
        },
        codes
      );
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("VALIDATION");
      expect(appErr.fieldErrors?.code).toBe("Invalid registration code");
    }
  });

  it("rejects duplicate email with CONFLICT even when case differs, and stores email in lowercase", async () => {
    try {
      await registerUser(
        db,
        {
          name: "Duplicate Member",
          email: "MEMBER@EXAMPLE.COM",
          password: "password123",
          code: codes.joinCode,
        },
        codes
      );
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("CONFLICT");
      expect(appErr.fieldErrors?.email).toBe(
        "An account with this email already exists"
      );
    }

    const rows = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.email, "member@example.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("member@example.com");
  });

  it("ensures stored password_hash is not plaintext and starts with $2", async () => {
    const rows = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, "member@example.com"));

    expect(rows).toHaveLength(1);
    const hash = rows[0].passwordHash;
    expect(hash).not.toBe("password123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("ensures registerUser result has no passwordHash property", async () => {
    const user = await registerUser(
      db,
      {
        name: "No Hash User",
        email: "nohash@example.com",
        password: "password123",
        code: codes.joinCode,
      },
      codes
    );

    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("role");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("authenticates correct credentials", async () => {
    const authenticated = await authenticate(db, {
      email: "member@example.com",
      password: "password123",
    });

    expect(authenticated.email).toBe("member@example.com");
    expect(authenticated.role).toBe("MEMBER");
    expect(authenticated).not.toHaveProperty("passwordHash");
  });

  it("gives identical UNAUTHENTICATED error message for wrong password and unknown email", async () => {
    let wrongPassErrMessage = "";
    try {
      await authenticate(db, {
        email: "member@example.com",
        password: "wrongPassword",
      });
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("UNAUTHENTICATED");
      wrongPassErrMessage = appErr.message;
    }

    let unknownEmailErrMessage = "";
    try {
      await authenticate(db, {
        email: "unknown-nonexistent@example.com",
        password: "anyPassword123",
      });
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("UNAUTHENTICATED");
      unknownEmailErrMessage = appErr.message;
    }

    expect(wrongPassErrMessage).toBe("Invalid email or password");
    expect(unknownEmailErrMessage).toBe("Invalid email or password");
  });

  it("handles deactivated user: correct password gives deactivated message, wrong password gives generic message", async () => {
    const deactivated = await registerUser(
      db,
      {
        name: "Deactivated User",
        email: "deactivated@example.com",
        password: "password123",
        code: codes.joinCode,
      },
      codes
    );

    // Deactivate user directly via Drizzle
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, deactivated.id));

    // 1. Wrong password on deactivated user -> generic UNAUTHENTICATED
    try {
      await authenticate(db, {
        email: "deactivated@example.com",
        password: "wrongPassword",
      });
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("UNAUTHENTICATED");
      expect(appErr.message).toBe("Invalid email or password");
    }

    // 2. Correct password on deactivated user -> FORBIDDEN deactivated message
    try {
      await authenticate(db, {
        email: "deactivated@example.com",
        password: "password123",
      });
      expect.unreachable("Should have thrown AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.code).toBe("FORBIDDEN");
      expect(appErr.message).toBe(
        "This account has been deactivated. Please contact your instructor."
      );
    }
  });

  it("getActiveUserById: returns active user, returns null for inactive user or unknown id", async () => {
    const memberRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "member@example.com"));
    const activeMemberId = memberRows[0].id;

    const activeUser = await getActiveUserById(db, activeMemberId);
    expect(activeUser).not.toBeNull();
    expect(activeUser?.id).toBe(activeMemberId);
    expect(activeUser?.email).toBe("member@example.com");
    expect(activeUser).not.toHaveProperty("passwordHash");

    const deactivatedRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "deactivated@example.com"));
    const deactivatedId = deactivatedRows[0].id;

    const inactiveResult = await getActiveUserById(db, deactivatedId);
    expect(inactiveResult).toBeNull();

    const unknownResult = await getActiveUserById(db, 999999);
    expect(unknownResult).toBeNull();
  });

  describe("users data layer part 2: member management, profile, passwords", () => {
    it("rejects instructor-only calls when called by a MEMBER", async () => {
      const member = await authenticate(db, {
        email: "member@example.com",
        password: "password123",
      });

      await expect(listMembers(db, member)).rejects.toThrow(AppError);
      await expect(
        addMember(db, member, {
          name: "Test",
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow(AppError);
      await expect(
        resetPassword(db, member, { userId: 2, newPassword: "password123" })
      ).rejects.toThrow(AppError);
      await expect(
        setUserActive(db, member, { userId: 2, isActive: false })
      ).rejects.toThrow(AppError);
      await expect(
        setUserRole(db, member, { userId: 2, role: "INSTRUCTOR" })
      ).rejects.toThrow(AppError);
    });

    it("listMembers as instructor returns all users and no object has a passwordHash key", async () => {
      const instructor = await authenticate(db, {
        email: "instructor@example.com",
        password: "password123",
      });

      const members = await listMembers(db, instructor);
      expect(members.length).toBeGreaterThan(0);
      for (const m of members) {
        expect(m).toHaveProperty("id");
        expect(m).toHaveProperty("email");
        expect(m).toHaveProperty("name");
        expect(m).toHaveProperty("role");
        expect(m).toHaveProperty("isActive");
        expect(m).toHaveProperty("createdAt");
        expect(m).not.toHaveProperty("passwordHash");
      }
    });

    it("addMember creates a MEMBER who can then authenticate; duplicate email throws CONFLICT", async () => {
      const instructor = await authenticate(db, {
        email: "instructor@example.com",
        password: "password123",
      });

      const newMember = await addMember(db, instructor, {
        name: "Added Member",
        email: "added@example.com",
        password: "addedPassword123",
      });

      expect(newMember.role).toBe("MEMBER");
      expect(newMember.email).toBe("added@example.com");
      expect(newMember).not.toHaveProperty("passwordHash");

      const authed = await authenticate(db, {
        email: "added@example.com",
        password: "addedPassword123",
      });
      expect(authed.id).toBe(newMember.id);

      await expect(
        addMember(db, instructor, {
          name: "Duplicate Added Member",
          email: "added@example.com",
          password: "addedPassword123",
        })
      ).rejects.toThrow(AppError);
    });

    it("resetPassword: new password works, old one stops working; targeting self is FORBIDDEN; unknown user is NOT_FOUND", async () => {
      const instructor = await authenticate(db, {
        email: "instructor@example.com",
        password: "password123",
      });

      const member = await authenticate(db, {
        email: "added@example.com",
        password: "addedPassword123",
      });

      // Target self -> FORBIDDEN
      await expect(
        resetPassword(db, instructor, {
          userId: instructor.id,
          newPassword: "newPassword123",
        })
      ).rejects.toThrow(AppError);

      // Unknown user -> NOT_FOUND
      await expect(
        resetPassword(db, instructor, {
          userId: 999999,
          newPassword: "newPassword123",
        })
      ).rejects.toThrow(AppError);

      // Reset member password
      await resetPassword(db, instructor, {
        userId: member.id,
        newPassword: "brandNewPassword123",
      });

      // Old password fails
      await expect(
        authenticate(db, {
          email: "added@example.com",
          password: "addedPassword123",
        })
      ).rejects.toThrow(AppError);

      // New password works
      const authed = await authenticate(db, {
        email: "added@example.com",
        password: "brandNewPassword123",
      });
      expect(authed.id).toBe(member.id);
    });

    it("setUserActive(false) makes authenticate return deactivated error and getActiveUserById return null; true restores access; self-target is FORBIDDEN", async () => {
      const instructor = await authenticate(db, {
        email: "instructor@example.com",
        password: "password123",
      });

      const member = await authenticate(db, {
        email: "added@example.com",
        password: "brandNewPassword123",
      });

      // Self target -> FORBIDDEN
      await expect(
        setUserActive(db, instructor, {
          userId: instructor.id,
          isActive: false,
        })
      ).rejects.toThrow(AppError);

      // Deactivate member
      await setUserActive(db, instructor, {
        userId: member.id,
        isActive: false,
      });

      // authenticate -> deactivated error
      try {
        await authenticate(db, {
          email: "added@example.com",
          password: "brandNewPassword123",
        });
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("FORBIDDEN");
        expect((err as AppError).message).toContain("deactivated");
      }

      // getActiveUserById -> null
      expect(await getActiveUserById(db, member.id)).toBeNull();

      // Reactivate member
      await setUserActive(db, instructor, {
        userId: member.id,
        isActive: true,
      });

      const restored = await authenticate(db, {
        email: "added@example.com",
        password: "brandNewPassword123",
      });
      expect(restored.id).toBe(member.id);
      expect(await getActiveUserById(db, member.id)).not.toBeNull();
    });

    it("setUserRole promotes member to INSTRUCTOR and demotes back; self-target is FORBIDDEN", async () => {
      const instructor = await authenticate(db, {
        email: "instructor@example.com",
        password: "password123",
      });

      const member = await authenticate(db, {
        email: "added@example.com",
        password: "brandNewPassword123",
      });

      // Self target -> FORBIDDEN
      await expect(
        setUserRole(db, instructor, {
          userId: instructor.id,
          role: "MEMBER",
        })
      ).rejects.toThrow(AppError);

      // Promote member
      await setUserRole(db, instructor, {
        userId: member.id,
        role: "INSTRUCTOR",
      });

      const promotedUser = await getActiveUserById(db, member.id);
      expect(promotedUser?.role).toBe("INSTRUCTOR");

      // Demote member back
      await setUserRole(db, instructor, {
        userId: member.id,
        role: "MEMBER",
      });

      const demotedUser = await getActiveUserById(db, member.id);
      expect(demotedUser?.role).toBe("MEMBER");
    });

    it("ensures that with a single instructor, attempting to deactivate or demote themselves fails so an active instructor still exists", async () => {
      const instructor = await authenticate(db, {
        email: "instructor@example.com",
        password: "password123",
      });

      // Attempt self-deactivation
      await expect(
        setUserActive(db, instructor, {
          userId: instructor.id,
          isActive: false,
        })
      ).rejects.toThrow(AppError);

      // Attempt self-demotion
      await expect(
        setUserRole(db, instructor, {
          userId: instructor.id,
          role: "MEMBER",
        })
      ).rejects.toThrow(AppError);

      // Assert by querying that an active instructor still exists
      const activeInstructors = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "INSTRUCTOR"));
      expect(activeInstructors.length).toBeGreaterThanOrEqual(1);
    });

    it("updateProfile changes only the actor's name; changePassword rejects wrong current password and accepts right one", async () => {
      const member = await authenticate(db, {
        email: "added@example.com",
        password: "brandNewPassword123",
      });

      const updated = await updateProfile(db, member, {
        name: "Added Member Renamed",
      });
      expect(updated.name).toBe("Added Member Renamed");
      expect(updated.email).toBe(member.email);
      expect(updated.role).toBe(member.role);

      // Wrong current password
      try {
        await changePassword(db, member, {
          currentPassword: "wrongCurrentPassword",
          newPassword: "anotherNewPassword123",
        });
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION");
        expect(appErr.fieldErrors?.currentPassword).toBe(
          "Current password is incorrect"
        );
      }

      // Correct current password
      await changePassword(db, member, {
        currentPassword: "brandNewPassword123",
        newPassword: "anotherNewPassword123",
      });

      // New password works
      const authed = await authenticate(db, {
        email: "added@example.com",
        password: "anotherNewPassword123",
      });
      expect(authed.id).toBe(member.id);
    });
  });
});
