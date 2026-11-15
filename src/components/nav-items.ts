export interface NavItem {
  label: string;
  href: string;
  instructorOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Reflections", href: "/reflections" },
  { label: "News", href: "/news" },
  { label: "Manage news", href: "/news/manage", instructorOnly: true },
  { label: "Tutor", href: "/tutor" },
  { label: "Members", href: "/settings/members", instructorOnly: true },
  { label: "Settings", href: "/settings" },
];
