import fs from "node:fs";
import path from "node:path";
import { getDatabaseEnv } from "../src/lib/env";
import { createDb } from "../src/lib/db/client";
import { runMigrations } from "../src/lib/db/migrate";

async function main() {
  try {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getDatabaseEnv();

    if (DATABASE_URL.startsWith("file:")) {
      const rawPath = DATABASE_URL.slice("file:".length);
      const absolutePath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(process.cwd(), rawPath);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const { db, client } = createDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
    await runMigrations(db);

    // Print the URL with any query params/tokens removed if present
    const sanitizedUrl = DATABASE_URL.split("?")[0];
    console.log(`Migrations applied to ${sanitizedUrl}`);

    client.close();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
