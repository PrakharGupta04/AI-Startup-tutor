import React from "react";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { AppShell } from "@/components/app-shell";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const env = getEnv();

  return (
    <AppShell user={user} groupName={env.GROUP_NAME}>
      {children}
    </AppShell>
  );
}
