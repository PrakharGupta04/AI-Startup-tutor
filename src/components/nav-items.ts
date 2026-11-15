export interface NavItem {
  label: string;
  href: string;
  instructorOnly?: boolean;
  icon: string;
  section?: "main" | "manage";
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    section: "main",
  },
  {
    label: "Reflections",
    href: "/reflections",
    icon: "NotebookPen",
    section: "main",
  },
  {
    label: "News",
    href: "/news",
    icon: "Newspaper",
    section: "main",
  },
  {
    label: "Tutor",
    href: "/tutor",
    icon: "MessagesSquare",
    section: "main",
  },
  {
    label: "Manage news",
    href: "/news/manage",
    instructorOnly: true,
    icon: "FilePlus2",
    section: "manage",
  },
  {
    label: "Members",
    href: "/settings/members",
    instructorOnly: true,
    icon: "Users",
    section: "manage",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    section: "main",
  },
];
