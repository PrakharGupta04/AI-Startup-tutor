import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getDatabaseEnv } from "../env";

export function createDb(url: string, authToken?: string) {
  const client: Client = createClient({ url, authToken });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Db = ReturnType<typeof createDb>["db"];

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
};

export function getDb(): Db {
  if (!globalForDb.db) {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getDatabaseEnv();
    const { db } = createDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
    globalForDb.db = db;
  }
  return globalForDb.db;
}
