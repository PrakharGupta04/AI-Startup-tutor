import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDb } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function createTestDb() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cst-test-"));
  const dbPath = path.join(tempDir, "test.db").replace(/\\/g, "/");
  const url = `file:${dbPath}`;
  const { db, client } = createDb(url);

  await runMigrations(db);

  const cleanup = () => {
    try {
      client.close();
    } catch {
      // ignore
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore errors from locked files on Windows
    }
  };

  return { db, client, cleanup };
}
