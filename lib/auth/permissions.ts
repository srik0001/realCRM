import type { Lead, UserProfile } from "@/types";

/**
 * Single source of truth for what each role may do in the UI.
 * The same rules are enforced server-side by database.rules.json and the /api routes;
 * keep the three in sync when changing access.
 */
export type Permission =
  | "dashboard:view"
  | "leads:view"
  | "leads:create"
  | "leads:assign"
  | "leads:delete"
  | "leads:viewAll"
  | "leads:viewDepartment"
  | "activities:view"
  | "projects:manage"
  | "departments:manage"
  | "users:manage"
  | "entities:manage"
  | "masters:manage"
  | "reports:view"
  | "settings:view"
  | "settings:manageApp";

export function isActive(user: UserProfile | null | undefined): user is UserProfile {
  return Boolean(user && user.status === "active");
}

export function hasPermission(user: UserProfile | null | undefined, permission: Permission): boolean {
  if (!isActive(user)) return false;
  const role = user.role;
  if (role === "admin") return true;

  switch (permission) {
    case "dashboard:view":
    case "leads:view":
    case "activities:view":
    case "settings:view":
      return true;
    case "leads:create":
      return role === "dept_head" || user.canCreateLeads === true;
    case "leads:assign":
    case "leads:viewDepartment":
    case "reports:view":
      return role === "dept_head";
    default:
      return false;
  }
}

/** Whether the user may see a given lead. Mirrors the read rule on /leads/$leadId. */
export function canViewLead(user: UserProfile | null | undefined, lead: Lead): boolean {
  if (!isActive(user)) return false;
  if (user.role === "admin") return true;
  if (lead.assignedTo === user.id) return true;
  return user.role === "dept_head" && !!user.departmentId && lead.departmentId === user.departmentId;
}

export const canEditLead = canViewLead;

/** Whether the user may change who a lead is assigned to. */
export function canAssignLead(user: UserProfile | null | undefined, lead?: Lead): boolean {
  if (!isActive(user)) return false;
  if (user.role === "admin") return true;
  if (user.role !== "dept_head") return false;
  return !lead || lead.departmentId === user.departmentId;
}

/** Users that `actor` may assign a lead to, optionally filtered by department and project access. */
export function assignableUsers(
  actor: UserProfile | null | undefined,
  users: UserProfile[],
  opts: { departmentId?: string; projectId?: string } = {},
): UserProfile[] {
  if (!isActive(actor)) return [];
  return users.filter((u) => {
    if (u.status !== "active" || u.role === "admin") return false;
    if (opts.departmentId && u.departmentId !== opts.departmentId) return false;
    if (opts.projectId && !u.projectIds?.[opts.projectId]) return false;
    if (actor.role === "admin") return true;
    if (actor.role === "dept_head") return u.departmentId === actor.departmentId;
    return u.id === actor.id;
  });
}
