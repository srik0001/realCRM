#!/usr/bin/env node
/**
 * Generates database.rules.json.
 *
 * Realtime Database rules have no functions, so the same role checks would be
 * repeated dozens of times by hand. Edit the macros and tree here, then run
 * `npm run rules:build`. The generated JSON is what gets deployed.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ME = "root.child('users').child(auth.uid)";
const SIGNED = `(auth != null && ${ME}.child('status').val() == 'active')`;
const ADMIN = `(${SIGNED} && ${ME}.child('role').val() == 'admin')`;
const HEAD = `(${SIGNED} && ${ME}.child('role').val() == 'dept_head')`;
const MYDEPT = `${ME}.child('departmentId').val()`;
const userDept = (uidExpr) => `root.child('users').child(${uidExpr}).child('departmentId').val()`;

const str = (max, min = 0) =>
  `newData.isString() && newData.val().length >= ${min} && newData.val().length <= ${max}`;
const num = "newData.isNumber()";
const exists = (path) => `root.child('${path}').child(newData.val()).exists()`;
const oneOf = (values) => `newData.isString() && newData.val().matches(/^(${values.join("|")})$/)`;
const RECORD_STATUS = oneOf(["active", "inactive"]);
const PHONE = "newData.isString() && newData.val().matches(/^\\+?[0-9][0-9 ()-]{5,19}$/)";
const EMAIL = "newData.isString() && newData.val().length <= 160 && newData.val().matches(/^[^@ ]+@[^@ ]+\\.[^@ ]+$/)";
const DATE = "newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)";
const DENY_OTHERS = { $other: { ".validate": false } };

const v = (expr) => ({ ".validate": expr });
const join_ = (...parts) => parts.join(" || ");
const and = (...parts) => parts.join(" && ");

/** Shared shape for admin-managed master records. */
function master(extraFields = {}, required = []) {
  return {
    ".read": SIGNED,
    ".write": ADMIN,
    $id: {
      ".validate": `newData.hasChildren(['name', 'status', 'createdBy', 'createdAt'${required.map((r) => `, '${r}'`).join("")}])`,
      name: v(str(120, 1)),
      description: v(str(500)),
      status: v(RECORD_STATUS),
      createdBy: v("newData.isString()"),
      createdAt: v(num),
      updatedAt: v(num),
      ...extraFields,
      ...DENY_OTHERS,
    },
  };
}

// --- Leads ---------------------------------------------------------------
const N = (f) => `newData.child('${f}').val()`;
const D = (f) => `data.child('${f}').val()`;
const auditUnchanged = and(`${N("createdBy")} == ${D("createdBy")}`, `${N("createdAt")} == ${D("createdAt")}`);

const leadWrite = join_(
  ADMIN,
  // Create: reps with lead-creation enabled (self-assigned, own department, assigned project)...
  `(${and(
    SIGNED,
    "!data.exists()",
    "newData.exists()",
    `${N("createdBy")} == auth.uid`,
    `${ME}.child('canCreateLeads').val() == true`,
    `${N("assignedTo")} == auth.uid`,
    `${N("departmentId")} == ${MYDEPT}`,
    `${ME}.child('projectIds').child(${N("projectId")}).val() == true`,
  )})`,
  // ...or department heads, for users inside their department.
  `(${and(
    HEAD,
    "!data.exists()",
    "newData.exists()",
    `${N("createdBy")} == auth.uid`,
    `${N("departmentId")} == ${MYDEPT}`,
    `${userDept(N("assignedTo"))} == ${MYDEPT}`,
  )})`,
  // Update by the assigned user: cannot reassign, move department, or touch audit fields.
  `(${and(
    SIGNED,
    "data.exists()",
    "newData.exists()",
    `${D("assignedTo")} == auth.uid`,
    `${N("assignedTo")} == auth.uid`,
    `${N("departmentId")} == ${D("departmentId")}`,
    auditUnchanged,
  )})`,
  // Update by a department head: may reassign, but only within their department.
  `(${and(
    HEAD,
    "data.exists()",
    "newData.exists()",
    `${D("departmentId")} == ${MYDEPT}`,
    `${N("departmentId")} == ${MYDEPT}`,
    `${userDept(N("assignedTo"))} == ${MYDEPT}`,
    auditUnchanged,
  )})`,
);

const leads = {
  ".read": join_(
    ADMIN,
    `(${SIGNED} && query.orderByChild == 'assignedTo' && query.equalTo == auth.uid)`,
    `(${HEAD} && query.orderByChild == 'departmentId' && query.equalTo == ${MYDEPT})`,
  ),
  ".indexOn": ["assignedTo", "departmentId", "createdAt"],
  $leadId: {
    ".read": join_(
      ADMIN,
      `(${SIGNED} && ${D("assignedTo")} == auth.uid)`,
      `(${HEAD} && ${D("departmentId")} == ${MYDEPT})`,
    ),
    ".write": leadWrite,
    ".validate":
      "newData.hasChildren(['name', 'email', 'phone', 'projectId', 'departmentId', 'assignedTo', 'statusId', 'sourceId', 'createdBy', 'createdAt', 'updatedAt', 'lastActivityAt'])",
    name: v(str(120, 1)),
    email: v(EMAIL),
    phone: v(PHONE),
    altPhone: v(PHONE),
    projectId: v(exists("projects")),
    departmentId: v(exists("departments")),
    assignedTo: v(exists("users")),
    statusId: v(exists("leadStatuses")),
    sourceId: v(exists("sources")),
    subSourceId: v(
      "root.child('subSources').child(newData.val()).child('sourceId').val() == newData.parent().child('sourceId').val()",
    ),
    remarks: v(str(1000)),
    notes: v(str(2000)),
    preferredLocation: v(str(160)),
    budget: v(str(60)),
    followUpDate: v(DATE),
    createdBy: v("newData.isString()"),
    createdAt: v(num),
    updatedAt: v(num),
    lastActivityAt: v(num),
    ...DENY_OTHERS,
  },
};

// --- Activities ----------------------------------------------------------
// The lead as it will be after this write (supports multi-path create + activity).
const L = (f) => `newData.parent().parent().child('leads').child(${N("leadId")}).child('${f}').val()`;
const QL = (f) => `root.child('leads').child(query.equalTo).child('${f}').val()`;

const ACTIVITY_TYPES = [
  "lead_created", "status_changed", "assigned", "reassigned", "call_made", "call_not_answered",
  "whatsapp_sent", "email_sent", "meeting_scheduled", "site_visit_scheduled", "site_visit_completed",
  "follow_up", "note_added", "lead_lost", "lead_won", "other",
];

const activities = {
  ".read": join_(
    ADMIN,
    `(${HEAD} && query.orderByChild == 'departmentId' && query.equalTo == ${MYDEPT})`,
    `(${SIGNED} && query.orderByChild == 'leadId' && (${QL("assignedTo")} == auth.uid || (${HEAD} && ${QL("departmentId")} == ${MYDEPT})))`,
  ),
  ".indexOn": ["leadId", "departmentId", "createdAt"],
  $activityId: {
    ".read": join_(
      ADMIN,
      `(${SIGNED} && root.child('leads').child(${D("leadId")}).child('assignedTo').val() == auth.uid)`,
      `(${HEAD} && ${D("departmentId")} == ${MYDEPT})`,
    ),
    // Activities are append-only for everyone except admins.
    ".write": join_(
      ADMIN,
      `(${and(
        SIGNED,
        "!data.exists()",
        `${N("createdBy")} == auth.uid`,
        `${N("departmentId")} == ${L("departmentId")}`,
        `(${L("assignedTo")} == auth.uid || (${HEAD} && ${L("departmentId")} == ${MYDEPT}))`,
      )})`,
    ),
    ".validate": "newData.hasChildren(['leadId', 'departmentId', 'type', 'createdBy', 'createdAt'])",
    leadId: v("newData.isString()"),
    departmentId: v("newData.isString()"),
    type: v(oneOf(ACTIVITY_TYPES)),
    description: v(str(2000)),
    createdBy: v("newData.isString()"),
    createdAt: v(`${num} && newData.val() <= now + 60000`),
    oldStatusId: v("newData.isString()"),
    newStatusId: v("newData.isString()"),
    oldAssignedTo: v("newData.isString()"),
    newAssignedTo: v("newData.isString()"),
    ...DENY_OTHERS,
  },
};

// --- Users ---------------------------------------------------------------
const users = {
  ".read": SIGNED,
  $uid: {
    // Own profile stays readable when inactive so the app can explain why access is blocked.
    ".read": "auth != null && auth.uid == $uid",
    ".write": ADMIN,
    ".validate": "newData.hasChildren(['fullName', 'email', 'role', 'status'])",
    fullName: { ".write": `auth.uid == $uid && ${SIGNED}`, ".validate": str(120, 1) },
    phone: { ".write": `auth.uid == $uid && ${SIGNED}`, ".validate": PHONE },
    email: v(EMAIL),
    role: v(oneOf(["admin", "presales", "sales", "dept_head"])),
    departmentId: v(exists("departments")),
    projectIds: { $projectId: v("newData.val() == true && root.child('projects').child($projectId).exists()") },
    status: v(RECORD_STATUS),
    canCreateLeads: v("newData.isBoolean()"),
    createdBy: v("newData.isString()"),
    createdAt: v(num),
    updatedAt: v(num),
    ...DENY_OTHERS,
  },
};

const rules = {
  rules: {
    entities: master(),
    projects: master(
      { entityId: v(exists("entities")), location: v(str(160)) },
      ["entityId"],
    ),
    departments: master(),
    leadStatuses: master(
      {
        color: v(str(20, 1)),
        order: v(num),
        category: v(oneOf(["open", "won", "lost"])),
      },
      ["category", "order"],
    ),
    sources: master(),
    subSources: master({ sourceId: v(exists("sources")) }, ["sourceId"]),
    users,
    leads,
    activities,
    notifications: {
      $uid: {
        ".read": "auth != null && auth.uid == $uid",
        $notificationId: {
          ".write": join_(
            "(auth != null && auth.uid == $uid)",
            `(${SIGNED} && !data.exists() && ${N("createdBy")} == auth.uid)`,
          ),
          ".validate": "newData.hasChildren(['title', 'read', 'createdBy', 'createdAt'])",
          title: v(str(200, 1)),
          body: v(str(500)),
          leadId: v("newData.isString()"),
          read: v("newData.isBoolean()"),
          createdBy: v("newData.isString()"),
          createdAt: v(num),
          ...DENY_OTHERS,
        },
      },
    },
    settings: {
      ".read": SIGNED,
      ".write": ADMIN,
      app: {
        companyName: v(str(120)),
        defaultCanCreateLeads: v("newData.isBoolean()"),
        ...DENY_OTHERS,
      },
    },
  },
};

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "database.rules.json");
writeFileSync(out, JSON.stringify(rules, null, 2) + "\n");
console.log(`Wrote ${out}`);
