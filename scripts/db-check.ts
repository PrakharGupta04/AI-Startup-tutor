import fs from "node:fs";
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

const EXPECTED_TABLES = [
  "users",
  "reflections",
  "interactions",
  "interaction_notes",
  "news_items",
] as const;

function formatTarget(databaseUrl: string): string {
  if (databaseUrl.startsWith("file:")) {
    return databaseUrl.slice("file:".length);
  }
  try {
    const parsed = new URL(databaseUrl);
    return parsed.hostname;
  } catch {
    return "remote-host";
  }
}

async function main() {
  let client;
  try {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getDatabaseEnv();
    const target = formatTarget(DATABASE_URL);
    console.log(`Database target: ${target}`);

    const dbBundle = createDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
    client = dbBundle.client;

    const fkResult = await client.execute("PRAGMA foreign_keys;");
    const fkVal = fkResult.rows[0]?.[0] ?? fkResult.rows[0]?.foreign_keys ?? "unknown";
    console.log(`PRAGMA foreign_keys: ${fkVal}`);

    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    const existingTables = new Set(
      tablesResult.rows.map((row) => String(row[0] ?? row.name))
    );

    let hasMissing = false;
    console.log("Tables status:");
    for (const table of EXPECTED_TABLES) {
      if (existingTables.has(table)) {
        console.log(`  ${table}: OK`);
      } else {
        console.log(`  ${table}: MISSING`);
        hasMissing = true;
      }
    }

    if (hasMissing) {
      console.error("Error: One or more expected tables are missing.");
      client.close();
      process.exit(1);
    }

    console.log("Row counts:");
    for (const table of EXPECTED_TABLES) {
      const countRes = await client.execute(
        `SELECT COUNT(*) as count FROM ${table};`
      );
      const count = countRes.rows[0]?.[0] ?? countRes.rows[0]?.count ?? 0;
      console.log(`  ${table}: ${count}`);
    }

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
    console.error("Database check failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
