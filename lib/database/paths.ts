/** Top-level Realtime Database collections. Keep in sync with database.rules.json. */
export const PATHS = {
  entities: "entities",
  projects: "projects",
  departments: "departments",
  users: "users",
  leadStatuses: "leadStatuses",
  sources: "sources",
  subSources: "subSources",
  leads: "leads",
  activities: "activities",
  notifications: "notifications",
  settings: "settings/app",
} as const;

export type CollectionPath = (typeof PATHS)[keyof typeof PATHS];
