import fs from "node:fs";
import { eq } from "drizzle-orm";
import { getDatabaseEnv } from "../src/lib/env";
import { createDb } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/password";

if (!process.env.DATABASE_URL) {
  if (typeof process.loadEnvFile === "function") {
    if (fs.existsSync(".env.local")) {
      process.loadEnvFile(".env.local");
    } else if (fs.existsSync(".env")) {
      process.loadEnvFile(".env");
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Usage: npm run set-password -- <email> <newPassword>");
    process.exit(1);
  }

  const [rawEmail, newPassword] = args;
  const email = rawEmail.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("Error: Please provide a valid email address.");
    process.exit(1);
  }

  if (!newPassword || newPassword.length < 8 || newPassword.length > 72) {
    console.error("Error: New password must be 8–72 characters.");
    process.exit(1);
  }

  if (Buffer.byteLength(newPassword, "utf8") > 72) {
    console.error("Error: New password must be at most 72 bytes.");
    process.exit(1);
  }

  let client;
  try {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getDatabaseEnv();
    const conn = createDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
    const db = conn.db;
    client = conn.client;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      client.close();
      process.exit(1);
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    console.log(
      `Password successfully set for "${user.name}" (${user.email}) [id=${user.id}].`
    );

    client.close();
    process.exit(0);
  } catch (error) {
    if (client) {
      try {
        client.close();
      } catch {
        // ignore close error
      }
    }
    console.error("Failed to set password:", error);
    process.exit(1);
  }
}

main();
