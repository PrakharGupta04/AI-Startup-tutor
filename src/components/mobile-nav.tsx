"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { NavLinks } from "./nav-links";
import { Avatar } from "./avatar";
import { Badge } from "./ui";
import type { AuthUser } from "@/lib/permissions";
import { isInstructor } from "@/lib/permissions";
import { logoutAction } from "@/app/(app)/actions";

export interface MobileNavProps {
  user: AuthUser;
  groupName: string;
}

export function MobileNav({ user, groupName }: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  const instructor = isInstructor(user);
  const roleLabel = instructor ? "Instructor" : "Member";
  const roleVariant = instructor ? "info" : "neutral";

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-surface border-b border-line">
      {/* 56px top bar */}
      <div className="h-14 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-brand text-white flex items-center justify-center font-bold text-sm shrink-0">
            C
          </div>
          <div className="min-w-0">
            <span className="font-serif font-semibold text-sm text-ink leading-tight block truncate">
              Corporate Startup Tutor
            </span>
            <span className="text-xs text-ink-muted leading-none block truncate">
              {groupName}
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <X className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Mobile panel */}
      {isOpen && (
        <div className="border-t border-line bg-surface p-4 shadow-sm space-y-4">
          <NavLinks
            isInstructor={instructor}
            includeSettings={true}
            onNavigate={() => setIsOpen(false)}
          />

          <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate leading-snug">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-danger hover:bg-danger-soft transition-colors"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Log out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
