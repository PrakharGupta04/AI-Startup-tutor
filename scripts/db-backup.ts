import fs from "node:fs";
import path from "node:path";
import { getDatabaseEnv } from "../src/lib/env";
import { createDb } from "../src/lib/db/client";

if (!process.env.DATABASE_URL) {
  if (typeof process.loadEnvFile === "function") {
    if (fs.existsSync(".env.local")) {
      process.loadEnvFile(".env.local");
    } else if (fs.existsSync(".env")) {
      process.loadEnvFile(".env");
    }
  }
}

const TABLES_TO_BACKUP = [
  "users",
  "reflections",
  "interactions",
  "interaction_notes",
  "news_items",
] as const;

async function main() {
  let client;
  try {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getDatabaseEnv();
    const dbBundle = createDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
    client = dbBundle.client;

    const backupData: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};

    for (const table of TABLES_TO_BACKUP) {
      const result = await client.execute(`SELECT * FROM ${table};`);
      backupData[table] = result.rows;
      rowCounts[table] = result.rows.length;
    }

    const backupsDir = path.resolve(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");

    console.log(`Backup written to: ${backupFilePath}`);
    console.log("Row counts:");
    for (const table of TABLES_TO_BACKUP) {
      console.log(`  ${table}: ${rowCounts[table]}`);
    }
    console.warn(
      "This file contains personal data and password hashes. Keep it private."
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
    console.error("Backup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
