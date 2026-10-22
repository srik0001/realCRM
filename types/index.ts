export type RecordStatus = "active" | "inactive";

export type Role = "admin" | "presales" | "sales" | "dept_head";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  presales: "Pre-Sales",
  sales: "Sales",
  dept_head: "Department Head",
};

/** Fields shared by every record stored in the database. */
export interface BaseRecord {
  id: string;
  status: RecordStatus;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Entity extends BaseRecord {
  name: string;
  description?: string;
}

export interface Project extends BaseRecord {
  name: string;
  entityId: string;
  description?: string;
  location?: string;
}

export interface Department extends BaseRecord {
  name: string;
  description?: string;
}

export interface UserProfile extends BaseRecord {
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  departmentId?: string;
  /** Map of projectId -> true. */
  projectIds?: Record<string, true>;
  /** Pre-Sales / Sales users may create leads only when this is enabled by an Admin. */
  canCreateLeads?: boolean;
}

export type StatusCategory = "open" | "won" | "lost";

export interface LeadStatus extends BaseRecord {
  name: string;
  color: string;
  order: number;
  category: StatusCategory;
}

export interface Source extends BaseRecord {
  name: string;
  description?: string;
}

export interface SubSource extends BaseRecord {
  name: string;
  sourceId: string;
  description?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  projectId: string;
  departmentId: string;
  assignedTo: string;
  statusId: string;
  sourceId: string;
  subSourceId?: string;
  remarks?: string;
  /** ISO date, YYYY-MM-DD */
  followUpDate?: string;
  preferredLocation?: string;
  budget?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
}

export const ACTIVITY_TYPES = [
  "lead_created",
  "status_changed",
  "assigned",
  "reassigned",
  "call_made",
  "call_not_answered",
  "whatsapp_sent",
  "email_sent",
  "meeting_scheduled",
  "site_visit_scheduled",
  "site_visit_completed",
  "follow_up",
  "note_added",
  "lead_lost",
  "lead_won",
  "other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Activity types a user can log by hand; the rest are written by the system. */
export const MANUAL_ACTIVITY_TYPES: ActivityType[] = [
  "call_made",
  "call_not_answered",
  "whatsapp_sent",
  "email_sent",
  "meeting_scheduled",
  "site_visit_scheduled",
  "site_visit_completed",
  "follow_up",
  "note_added",
  "other",
];

export interface LeadActivity {
  id: string;
  leadId: string;
  /** Department of the lead when the activity was logged; lets department heads read their feed. */
  departmentId: string;
  type: ActivityType;
  description?: string;
  createdBy: string;
  createdAt: number;
  oldStatusId?: string;
  newStatusId?: string;
  oldAssignedTo?: string;
  newAssignedTo?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  leadId?: string;
  read: boolean;
  createdBy: string;
  createdAt: number;
}

export interface AppSettings {
  companyName?: string;
  /** Default for the "can create leads" toggle on new Pre-Sales/Sales users. */
  defaultCanCreateLeads?: boolean;
}
