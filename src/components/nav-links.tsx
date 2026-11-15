"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookPen,
  Newspaper,
  MessagesSquare,
  FilePlus2,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { navItems, type NavItem } from "./nav-items";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  NotebookPen,
  Newspaper,
  MessagesSquare,
  FilePlus2,
  Users,
  Settings,
};

export function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/news") {
    if (pathname.startsWith("/news/manage")) {
      return false;
    }
    return pathname === "/news" || pathname.startsWith("/news/");
  }
  if (href === "/settings") {
    if (pathname.startsWith("/settings/members")) {
      return false;
    }
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export interface NavLinksProps {
  isInstructor: boolean;
  onNavigate?: () => void;
  includeSettings?: boolean;
  className?: string;
}

export function NavLinkItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 min-h-[40px] rounded-md text-sm transition-colors ${
        isActive
          ? "bg-brand-soft text-brand font-medium"
          : "text-ink-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span>{item.label}</span>
    </Link>
  );
}

export function NavLinks({
  isInstructor,
  onNavigate,
  includeSettings = false,
  className = "",
}: NavLinksProps) {
  const pathname = usePathname();

  const mainItems = navItems.filter(
    (item) => item.section === "main" && item.href !== "/settings"
  );
  const manageItems = navItems.filter(
    (item) => item.section === "manage" && (!item.instructorOnly || isInstructor)
  );
  const settingsItem = navItems.find((item) => item.href === "/settings");

  return (
    <nav className={`space-y-1 ${className}`}>
      {mainItems.map((item) => (
        <NavLinkItem
          key={item.href}
          item={item}
          isActive={isItemActive(pathname, item.href)}
          onClick={onNavigate}
        />
      ))}

      {isInstructor && manageItems.length > 0 && (
        <div className="pt-3">
          <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-ink-subtle uppercase">
            Manage
          </div>
          <div className="space-y-1">
            {manageItems.map((item) => (
              <NavLinkItem
                key={item.href}
                item={item}
                isActive={isItemActive(pathname, item.href)}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {includeSettings && settingsItem && (
        <div className="pt-3 border-t border-line mt-3">
          <NavLinkItem
            item={settingsItem}
            isActive={isItemActive(pathname, settingsItem.href)}
            onClick={onNavigate}
          />
        </div>
      )}
    </nav>
  );
}

export function SettingsNavLink({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const settingsItem = navItems.find((item) => item.href === "/settings");
  if (!settingsItem) return null;

  return (
    <NavLinkItem
      item={settingsItem}
      isActive={isItemActive(pathname, settingsItem.href)}
      onClick={onNavigate}
    />
  );
}
