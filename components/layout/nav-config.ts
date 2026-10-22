import {
  Activity,
  BarChart3,
  Building,
  Database,
  FolderKanban,
  Layers,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Settings,
  Share2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  permission: Permission;
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Leads", href: "/leads", icon: UserRound, permission: "leads:view" },
  { label: "Lead Activities", href: "/activities", icon: Activity, permission: "activities:view" },
  { label: "Projects", href: "/projects", icon: FolderKanban, permission: "projects:manage" },
  { label: "Departments", href: "/departments", icon: Layers, permission: "departments:manage" },
  { label: "Users", href: "/users", icon: Users, permission: "users:manage" },
  { label: "Entities", href: "/entities", icon: Building, permission: "entities:manage" },
  {
    label: "Masters",
    icon: Database,
    permission: "masters:manage",
    children: [
      { label: "Lead Statuses", href: "/masters/statuses", icon: ListChecks, permission: "masters:manage" },
      { label: "Sources", href: "/masters/sources", icon: Megaphone, permission: "masters:manage" },
      { label: "Sub-Sources", href: "/masters/sub-sources", icon: Share2, permission: "masters:manage" },
    ],
  },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
];
