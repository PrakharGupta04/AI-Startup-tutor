import React from "react";
import Link from "next/link";
import { navItems } from "./nav-items";

export interface AppShellProps {
  groupName: string;
  children: React.ReactNode;
}

export function AppShell({ groupName, children }: AppShellProps) {
  const hasNavItems = navItems.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[64px] items-center justify-between py-3 flex-wrap gap-2">
            <div className="flex items-baseline gap-3">
              <Link
                href="/"
                className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-600 transition-colors"
              >
                Corporate Startup Tutor
              </Link>
              <span className="text-xs sm:text-sm font-medium text-slate-500">
                {groupName}
              </span>
            </div>

            {hasNavItems && (
              <>
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Nav via details / summary (pure HTML, no client JS) */}
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
                  <nav className="absolute right-0 top-full mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </details>
              </>
            )}
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
