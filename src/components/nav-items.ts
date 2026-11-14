export interface NavItem {
  label: string;
  href: string;
  instructorOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/settings/members", instructorOnly: true },
  { label: "Settings", href: "/settings" },
];
