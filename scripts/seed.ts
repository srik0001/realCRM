/**
 * Seeds Firebase Auth + Realtime Database with the initial CRM data.
 *
 *   npm run seed            # upsert seed data (safe to re-run)
 *   npm run seed -- --reset # wipe the whole database first (destructive!)
 *
 * Uses the Admin SDK, so it bypasses security rules. Reads credentials from
 * .env.local (see .env.example). Set FIREBASE_AUTH_EMULATOR_HOST and
 * FIREBASE_DATABASE_EMULATOR_HOST to seed the local emulators instead.
 */
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import type { ActivityType, Role, StatusCategory } from "../types";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const usingEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST);

if (!projectId || !databaseURL) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_DATABASE_URL. Copy .env.example to .env.local.");
  process.exit(1);
}

const app = usingEmulator
  ? initializeApp({ projectId, databaseURL })
  : initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL,
    });

const auth = getAuth(app);
const db = getDatabase(app);
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "ChangeMe@123";
const DOMAIN = process.env.SEED_EMAIL_DOMAIN || "realcrm.test";
const RESET = process.argv.includes("--reset");

const now = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const daysAgo = (d: number, h = 0) => now - d * DAY - h * HOUR;
const isoDate = (offsetDays: number) => {
  const d = new Date(now + offsetDays * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SYSTEM = "seed";
const audit = (createdAt = daysAgo(30)) => ({ status: "active", createdBy: SYSTEM, createdAt, updatedAt: createdAt });

// ---------------------------------------------------------------------------
// Master data (stable ids so the script is idempotent)
// ---------------------------------------------------------------------------
const entities = { "default-entity": { name: "Default Entity", description: "Primary business unit", ...audit() } };

const projects = {
  "project-a": { name: "Project A", entityId: "default-entity", location: "Whitefield, Bengaluru", description: "2 & 3 BHK premium apartments", ...audit() },
  "project-b": { name: "Project B", entityId: "default-entity", location: "Sarjapur Road, Bengaluru", description: "Villas and row houses", ...audit() },
};

const departments = {
  presales: { name: "Pre-Sales", description: "Qualifies new enquiries and books site visits", ...audit() },
  sales: { name: "Sales", description: "Converts qualified leads into bookings", ...audit() },
};

const statusDefs: [string, string, string, StatusCategory][] = [
  ["new", "New", "blue", "open"],
  ["contacted", "Contacted", "teal", "open"],
  ["interested", "Interested", "violet", "open"],
  ["site-visit-scheduled", "Site Visit Scheduled", "pink", "open"],
  ["site-visit-completed", "Site Visit Completed", "pink", "open"],
  ["negotiation", "Negotiation", "amber", "open"],
  ["won", "Won", "green", "won"],
  ["lost", "Lost", "red", "lost"],
  ["follow-up", "Follow-up", "slate", "open"],
];
const leadStatuses = Object.fromEntries(
  statusDefs.map(([id, name, color, category], i) => [id, { name, color, category, order: i + 1, ...audit() }]),
);

const sourceDefs: Record<string, [string, [string, string][]]> = {
  facebook: ["Facebook", [["fb-lead-form", "Meta Lead Form"], ["fb-page", "Facebook Page"], ["fb-messenger", "Messenger"]]],
  "google-ads": ["Google Ads", [["ga-search", "Search Campaign"], ["ga-display", "Display Campaign"], ["ga-youtube", "YouTube"]]],
  website: ["Website", [["web-contact", "Contact Form"], ["web-chat", "Live Chat"], ["web-brochure", "Brochure Download"]]],
  "walk-in": ["Walk-in", [["walkin-site", "Site Office"], ["walkin-lounge", "Sales Lounge"]]],
  reference: ["Reference", [["ref-customer", "Existing Customer"], ["ref-partner", "Channel Partner"], ["ref-employee", "Employee Referral"]]],
  instagram: ["Instagram", [["ig-lead-form", "Instagram Lead Form"], ["ig-dm", "Direct Message"]]],
  "offline-campaign": ["Offline Campaign", [["off-newspaper", "Newspaper Ad"], ["off-hoarding", "Hoarding"], ["off-expo", "Property Expo"]]],
};
const sources = Object.fromEntries(Object.entries(sourceDefs).map(([id, [name]]) => [id, { name, ...audit() }]));
const subSources = Object.fromEntries(
  Object.entries(sourceDefs).flatMap(([sourceId, [, subs]]) => subs.map(([id, name]) => [id, { name, sourceId, ...audit() }])),
);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
type SeedUser = {
  key: string;
  fullName: string;
  emailLocal: string;
  phone: string;
  role: Role;
  departmentId?: string;
  projects: string[];
  canCreateLeads?: boolean;
};

const seedUsers: SeedUser[] = [
  { key: "admin", fullName: "Arjun Mehta", emailLocal: "admin", phone: "+91 98450 10001", role: "admin", projects: [] },
  { key: "priya", fullName: "Priya Nair", emailLocal: "priya.presales", phone: "+91 98450 10002", role: "presales", departmentId: "presales", projects: ["project-a", "project-b"], canCreateLeads: true },
  { key: "rahul", fullName: "Rahul Verma", emailLocal: "rahul.presales", phone: "+91 98450 10003", role: "presales", departmentId: "presales", projects: ["project-a"], canCreateLeads: false },
  { key: "sneha", fullName: "Sneha Iyer", emailLocal: "sneha.sales", phone: "+91 98450 10004", role: "sales", departmentId: "sales", projects: ["project-a", "project-b"], canCreateLeads: true },
  { key: "vikram", fullName: "Vikram Rao", emailLocal: "vikram.sales", phone: "+91 98450 10005", role: "sales", departmentId: "sales", projects: ["project-b"], canCreateLeads: false },
  // Optional role, included so department-level access can be tried out.
  { key: "meera", fullName: "Meera Joshi", emailLocal: "meera.saleshead", phone: "+91 98450 10006", role: "dept_head", departmentId: "sales", projects: ["project-a", "project-b"] },
];

async function upsertAuthUser(u: SeedUser): Promise<string> {
  const email = `${u.emailLocal}@${DOMAIN}`;
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password: PASSWORD, displayName: u.fullName, disabled: false });
    return existing.uid;
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
    const created = await auth.createUser({ email, password: PASSWORD, displayName: u.fullName });
    return created.uid;
  }
}

// ---------------------------------------------------------------------------
// Leads + activity history
// ---------------------------------------------------------------------------
type Step = { type: ActivityType; by: string; days: number; hours?: number; desc?: string; to?: string; assignTo?: string };

type SeedLead = {
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  project: string;
  dept: string;
  owner: string;
  source: string;
  subSource?: string;
  budget?: string;
  location?: string;
  notes?: string;
  followUp?: number;
  createdDaysAgo: number;
  history: Step[];
};

const seedLeads: SeedLead[] = [
  {
    name: "Ananya Sharma", email: "ananya.sharma@gmail.com", phone: "+91 98861 23450", project: "project-a", dept: "presales", owner: "priya",
    source: "facebook", subSource: "fb-lead-form", budget: "₹85L – 1Cr", location: "Whitefield", notes: "3BHK, east facing, needs possession within 6 months.",
    followUp: 0, createdDaysAgo: 6,
    history: [
      { type: "call_made", by: "priya", days: 5, desc: "Introductory call. Interested in 3BHK." },
      { type: "status_changed", by: "priya", days: 5, to: "contacted" },
      { type: "whatsapp_sent", by: "priya", days: 4, desc: "Shared brochure and floor plans." },
      { type: "status_changed", by: "priya", days: 2, to: "interested", desc: "Wants to visit this weekend." },
    ],
  },
  {
    name: "Rohan Gupta", email: "rohan.gupta@outlook.com", phone: "+91 99001 45672", project: "project-b", dept: "presales", owner: "priya",
    source: "google-ads", subSource: "ga-search", budget: "₹1.8Cr", location: "Sarjapur Road", notes: "Looking for a 4BHK villa with garden.",
    followUp: -2, createdDaysAgo: 9,
    history: [
      { type: "call_not_answered", by: "priya", days: 8 },
      { type: "call_made", by: "priya", days: 7, desc: "Spoke briefly, asked to call back next week." },
      { type: "status_changed", by: "priya", days: 7, to: "follow-up" },
    ],
  },
  {
    name: "Kavya Reddy", email: "kavya.reddy@yahoo.com", phone: "+91 97400 88123", project: "project-a", dept: "presales", owner: "rahul",
    source: "website", subSource: "web-contact", budget: "₹70L", location: "Brookefield", notes: "2BHK for parents.",
    createdDaysAgo: 0,
    history: [],
  },
  {
    name: "Aditya Kulkarni", email: "aditya.k@gmail.com", phone: "+91 98440 66721", project: "project-a", dept: "presales", owner: "rahul",
    source: "instagram", subSource: "ig-lead-form", budget: "₹90L", location: "Whitefield",
    followUp: 2, createdDaysAgo: 4,
    history: [
      { type: "call_made", by: "rahul", days: 3, desc: "Qualified. Budget confirmed with home loan pre-approval." },
      { type: "status_changed", by: "rahul", days: 3, to: "interested" },
      { type: "site_visit_scheduled", by: "rahul", days: 1, desc: "Site visit booked for Saturday 11am." },
      { type: "status_changed", by: "rahul", days: 1, to: "site-visit-scheduled" },
    ],
  },
  {
    name: "Neha Bansal", email: "neha.bansal@gmail.com", phone: "+91 99860 31244", project: "project-b", dept: "presales", owner: "priya",
    source: "offline-campaign", subSource: "off-expo", budget: "₹1.2Cr",
    createdDaysAgo: 15,
    history: [
      { type: "call_made", by: "priya", days: 14, desc: "Not looking to buy for another 2 years." },
      { type: "lead_lost", by: "priya", days: 14, to: "lost", desc: "Timeline too far out." },
    ],
  },
  {
    name: "Siddharth Menon", email: "sid.menon@gmail.com", phone: "+91 98455 70031", altPhone: "+91 80 4123 9988", project: "project-a", dept: "sales", owner: "sneha",
    source: "reference", subSource: "ref-customer", budget: "₹1.1Cr", location: "Whitefield", notes: "Referred by Mr. Iyer (Tower 2). Wants a corner unit.",
    followUp: 0, createdDaysAgo: 20,
    history: [
      { type: "assigned", by: "admin", days: 20, assignTo: "rahul" },
      { type: "call_made", by: "rahul", days: 19, desc: "Very keen, wants a site visit." },
      { type: "site_visit_completed", by: "rahul", days: 16, desc: "Visited sample flat with family." },
      { type: "status_changed", by: "rahul", days: 16, to: "site-visit-completed" },
      { type: "reassigned", by: "admin", days: 15, assignTo: "sneha", desc: "Moved to Sales after site visit." },
      { type: "meeting_scheduled", by: "sneha", days: 6, desc: "Pricing discussion at sales lounge." },
      { type: "status_changed", by: "sneha", days: 5, to: "negotiation", desc: "Asked for floor-rise waiver." },
    ],
  },
  {
    name: "Pooja Agarwal", email: "pooja.agarwal@hotmail.com", phone: "+91 97319 50422", project: "project-b", dept: "sales", owner: "vikram",
    source: "walk-in", subSource: "walkin-site", budget: "₹2Cr", location: "Sarjapur Road",
    createdDaysAgo: 25,
    history: [
      { type: "site_visit_completed", by: "vikram", days: 25, desc: "Walked in, toured model villa." },
      { type: "status_changed", by: "vikram", days: 25, to: "site-visit-completed" },
      { type: "status_changed", by: "vikram", days: 18, to: "negotiation" },
      { type: "lead_won", by: "vikram", days: 10, to: "won", desc: "Booking amount received for Villa 14." },
    ],
  },
  {
    name: "Karthik Subramanian", email: "karthik.s@gmail.com", phone: "+91 98804 21155", project: "project-a", dept: "sales", owner: "sneha",
    source: "google-ads", subSource: "ga-display", budget: "₹95L",
    followUp: -1, createdDaysAgo: 12,
    history: [
      { type: "call_made", by: "sneha", days: 11, desc: "Comparing with two other projects." },
      { type: "status_changed", by: "sneha", days: 11, to: "contacted" },
      { type: "email_sent", by: "sneha", days: 9, desc: "Sent price sheet and payment plan." },
      { type: "status_changed", by: "sneha", days: 8, to: "follow-up" },
    ],
  },
  {
    name: "Ishita Chatterjee", email: "ishita.c@gmail.com", phone: "+91 99167 84300", project: "project-b", dept: "sales", owner: "vikram",
    source: "facebook", subSource: "fb-messenger", budget: "₹1.5Cr",
    followUp: 3, createdDaysAgo: 3,
    history: [
      { type: "call_made", by: "vikram", days: 2, desc: "Interested in row houses." },
      { type: "status_changed", by: "vikram", days: 2, to: "interested" },
      { type: "note_added", by: "vikram", days: 1, desc: "Prefers units near the clubhouse." },
    ],
  },
  {
    name: "Manish Tiwari", email: "manish.tiwari@gmail.com", phone: "+91 98451 99087", project: "project-a", dept: "sales", owner: "sneha",
    source: "website", subSource: "web-chat", budget: "₹75L",
    createdDaysAgo: 30,
    history: [
      { type: "call_made", by: "sneha", days: 29 },
      { type: "status_changed", by: "sneha", days: 29, to: "contacted" },
      { type: "lead_lost", by: "sneha", days: 21, to: "lost", desc: "Bought elsewhere." },
    ],
  },
];

async function main() {
  console.log(`Seeding ${usingEmulator ? "the local emulators" : `project ${projectId}`}…`);
  if (RESET) {
    console.log("--reset: clearing the database");
    await db.ref().set(null);
  }

  const uids: Record<string, string> = {};
  const usersData: Record<string, unknown> = {};
  for (const u of seedUsers) {
    const uid = await upsertAuthUser(u);
    uids[u.key] = uid;
    usersData[uid] = {
      fullName: u.fullName,
      email: `${u.emailLocal}@${DOMAIN}`,
      phone: u.phone,
      role: u.role,
      ...(u.departmentId ? { departmentId: u.departmentId } : {}),
      ...(u.projects.length ? { projectIds: Object.fromEntries(u.projects.map((p) => [p, true])) } : {}),
      ...(u.role === "presales" || u.role === "sales" ? { canCreateLeads: !!u.canCreateLeads } : {}),
      ...audit(daysAgo(45)),
    };
  }
  const adminUid = uids.admin;
  // Stamp master records with the admin as creator.
  const stamp = <T extends Record<string, Record<string, unknown>>>(o: T) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, createdBy: adminUid }]));

  const updates: Record<string, unknown> = {
    entities: stamp(entities),
    projects: stamp(projects),
    departments: stamp(departments),
    leadStatuses: stamp(leadStatuses),
    sources: stamp(sources),
    subSources: stamp(subSources),
    settings: { app: { companyName: "RealCRM Realty", defaultCanCreateLeads: false } },
  };
  for (const [uid, data] of Object.entries(usersData)) updates[`users/${uid}`] = { ...(data as object), createdBy: adminUid };

  seedLeads.forEach((l, i) => {
    const leadId = `lead-${String(i + 1).padStart(3, "0")}`;
    const createdAt = daysAgo(l.createdDaysAgo, 4);
    // Walk the history to reconstruct ownership and status at each step.
    let status = "new";
    let owner = l.history.find((s) => s.type === "assigned")?.assignTo ?? l.owner;
    let lastActivityAt = createdAt;
    const acts: Record<string, unknown> = {};
    const dept = (key: string) => seedUsers.find((u) => u.key === key)?.departmentId ?? l.dept;

    acts[`${leadId}-00`] = {
      leadId, departmentId: dept(owner), type: "lead_created", description: "Lead created",
      newStatusId: "new", createdBy: adminUid, createdAt,
    };
    l.history.forEach((s, j) => {
      const at = Math.max(daysAgo(s.days, 2 - (j % 3)), createdAt + (j + 1) * 60_000);
      const act: Record<string, unknown> = { leadId, type: s.type, createdBy: uids[s.by], createdAt: at };
      if (s.desc) act.description = s.desc;
      if (s.to) {
        act.oldStatusId = status;
        act.newStatusId = s.to;
        status = s.to;
      }
      if (s.assignTo) {
        if (s.type === "reassigned") act.oldAssignedTo = uids[owner];
        act.newAssignedTo = uids[s.assignTo];
        owner = s.assignTo;
      }
      act.departmentId = dept(owner);
      acts[`${leadId}-${String(j + 1).padStart(2, "0")}`] = act;
      lastActivityAt = Math.max(lastActivityAt, at);
    });

    updates[`leads/${leadId}`] = {
      name: l.name,
      email: l.email,
      phone: l.phone,
      ...(l.altPhone ? { altPhone: l.altPhone } : {}),
      projectId: l.project,
      departmentId: l.dept,
      assignedTo: uids[l.owner],
      statusId: status,
      sourceId: l.source,
      ...(l.subSource ? { subSourceId: l.subSource } : {}),
      ...(l.budget ? { budget: l.budget } : {}),
      ...(l.location ? { preferredLocation: l.location } : {}),
      ...(l.notes ? { notes: l.notes } : {}),
      ...(l.followUp !== undefined ? { followUpDate: isoDate(l.followUp) } : {}),
      createdBy: adminUid,
      createdAt,
      updatedAt: lastActivityAt,
      lastActivityAt,
    };
    for (const [id, a] of Object.entries(acts)) updates[`activities/${id}`] = a;
  });

  await db.ref().update(updates);

  console.log("\nDone. Seeded users (password: %s):", PASSWORD);
  for (const u of seedUsers) console.log(`  ${u.role.padEnd(9)} ${u.fullName.padEnd(16)} ${u.emailLocal}@${DOMAIN}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
