import React from "react";
import Link from "next/link";
import { navItems } from "./nav-items";
import { Badge } from "./ui";
import { isInstructor, type AuthUser } from "@/lib/permissions";
import { logoutAction } from "@/app/(app)/actions";

export interface AppShellProps {
  user: AuthUser;
  groupName: string;
  children: React.ReactNode;
}

export function AppShell({ user, groupName, children }: AppShellProps) {
  const visibleNavItems = navItems.filter((item) => {
    if (item.instructorOnly && !isInstructor(user)) {
      return false;
    }
    return true;
  });

  const roleLabel = isInstructor(user) ? "Instructor" : "Member";
  const roleVariant = isInstructor(user) ? "info" : "neutral";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[64px] items-center justify-between py-3 gap-2">
            <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-600 transition-colors truncate"
              >
                Corporate Startup Tutor
              </Link>
              <span className="text-xs sm:text-sm font-medium text-slate-500 truncate hidden xs:inline">
                {groupName}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-4">
                {visibleNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <span className="text-sm font-medium text-slate-800">
                  {user.name}
                </span>
                <Badge variant={roleVariant}>{roleLabel}</Badge>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            {/* Mobile Navigation (Accessible at 360px, pure HTML details/summary) */}
            <details className="md:hidden relative">
              <summary className="list-none cursor-pointer rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span className="sr-only">Open navigation</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 top-full mt-2 w-64 rounded-md bg-white py-3 shadow-lg ring-1 ring-black/5 z-20">
                <div className="px-4 pb-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={roleVariant}>{roleLabel}</Badge>
                    <span className="text-xs text-slate-500 truncate">
                      {groupName}
                    </span>
                  </div>
                </div>

                <nav className="py-2">
                  {visibleNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="pt-2 border-t border-slate-100 px-4">
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full text-left text-sm font-medium text-red-600 hover:text-red-700 py-1 cursor-pointer"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
