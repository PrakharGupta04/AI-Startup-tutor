import { count } from "drizzle-orm";
import { getEnv, type AppEnv } from "@/lib/env";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";
import { Card, Badge, type BadgeVariant } from "@/components/ui";

export const instant = false;

export default async function StatusPage() {
  // Check 1: Environment
  let env: AppEnv | null = null;
  let envError: string | null = null;
  try {
    env = getEnv();
  } catch (error) {
    envError = error instanceof Error ? error.message : "Unknown error";
  }

  // Check 2: Database
  let dbConnected = false;
  let userCount = 0;
  let dbError: string | null = null;
  try {
    const db = getDb();
    const result = await db.select({ value: count() }).from(users);
    userCount = result[0]?.value ?? 0;
    dbConnected = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Unknown error";
  }

  // Check 3: AI Provider
  let aiStatus: {
    providerName: string;
    badgeText: string;
    badgeVariant: BadgeVariant;
  } = {
    providerName: env ? env.AI_PROVIDER : "Unknown",
    badgeText: "Configuration error",
    badgeVariant: "danger",
  };

  if (env) {
    const provider = env.AI_PROVIDER;
    const hasKey = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== "");

    if (provider === "demo") {
      aiStatus = {
        providerName: "demo",
        badgeText: "Demo mode: responses are not real AI",
        badgeVariant: "info",
      };
    } else if (provider === "gemini") {
      if (hasKey) {
        aiStatus = {
          providerName: "gemini",
          badgeText: "Configured",
          badgeVariant: "success",
        };
      } else {
        aiStatus = {
          providerName: "gemini",
          badgeText: "No API key: AI features disabled",
          badgeVariant: "warning",
        };
      }
    }
  }

  const groupName = env ? env.GROUP_NAME : "Setup";

  return (
    <AppShell groupName={groupName}>
      <Card title="System status">
        <div className="divide-y divide-slate-100">
          {/* Row 1: Environment */}
          <div className="py-4 first:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Environment
                </h3>
                {env && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Environment configuration loaded successfully
                  </p>
                )}
                {envError && (
                  <div className="mt-1">
                    <pre className="text-xs text-rose-700 whitespace-pre-wrap break-words font-mono">
                      {envError}
                    </pre>
                    <p className="text-xs text-slate-500 mt-1">
                      Hint: Edit .env.local
                    </p>
                  </div>
                )}
              </div>
              <div className="self-start sm:self-center">
                {env ? (
                  <Badge variant="success">Configured</Badge>
                ) : (
                  <Badge variant="danger">Invalid</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Database */}
          <div className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Database
                </h3>
                {dbConnected ? (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Users registered: {userCount}
                  </p>
                ) : (
                  <div className="mt-1">
                    {dbError && (
                      <p className="text-xs text-rose-700 font-mono">
                        {dbError}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Hint: Run npm run db:migrate
                    </p>
                  </div>
                )}
              </div>
              <div className="self-start sm:self-center">
                {dbConnected ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  <Badge variant="danger">Failed</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: AI Provider */}
          <div className="py-4 last:pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  AI provider
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Configured provider: {aiStatus.providerName}
                </p>
              </div>
              <div className="self-start sm:self-center">
                <Badge variant={aiStatus.badgeVariant}>
                  {aiStatus.badgeText}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
