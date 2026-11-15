import React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { NavLinks, SettingsNavLink } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { Avatar } from "./avatar";
import { Badge } from "./ui";
import { isInstructor, type AuthUser } from "@/lib/permissions";
import { logoutAction } from "@/app/(app)/actions";

export interface AppShellProps {
  user: AuthUser;
  groupName: string;
  children: React.ReactNode;
}

export function AppShell({ user, groupName, children }: AppShellProps) {
  const instructor = isInstructor(user);
  const roleLabel = instructor ? "Instructor" : "Member";
  const roleVariant = instructor ? "info" : "neutral";

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Mobile top bar and drawer navigation */}
      <MobileNav user={user} groupName={groupName} />

      {/* Desktop fixed sidebar (256px) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col justify-between bg-surface border-r border-line z-30">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand header */}
          <div className="p-5 border-b border-line">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
            >
              <div className="w-8 h-8 rounded-md bg-brand text-white flex items-center justify-center font-bold text-sm shrink-0">
                C
              </div>
              <div className="min-w-0">
                <span className="font-serif font-semibold text-sm text-ink leading-tight block truncate group-hover:text-brand transition-colors">
                  Corporate Startup Tutor
                </span>
                <span className="text-xs text-ink-muted leading-tight block truncate mt-0.5">
                  {groupName}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation links */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks isInstructor={instructor} />
          </div>
        </div>

        {/* Sidebar footer: Settings, User block, and Log out */}
        <div className="p-3 border-t border-line space-y-3 bg-surface">
          <div className="px-1">
            <SettingsNavLink />
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate leading-tight">
                  {user.name}
                </p>
                <div className="mt-0.5">
                  <Badge variant={roleVariant}>{roleLabel}</Badge>
                </div>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="p-1.5 rounded-md text-ink-muted hover:text-danger hover:bg-danger-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
