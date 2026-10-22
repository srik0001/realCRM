/**
 * Security-rules smoke test against the local emulators.
 *
 *   npm run emulators            # terminal 1
 *   npm run seed -- --reset      # terminal 2
 *   npm run test:rules
 *
 * Signs in as each seeded role and checks what the rules allow and deny.
 */
import { config } from "dotenv";
import { initializeApp, deleteApp, setLogLevel, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  connectDatabaseEmulator,
  equalTo,
  get,
  getDatabase,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type Database,
} from "firebase/database";

config({ path: ".env.local", quiet: true });
setLogLevel("silent");

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "ChangeMe@123";
const DOMAIN = process.env.SEED_EMAIL_DOMAIN || "realcrm.test";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-realcrm";
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `http://127.0.0.1:9000?ns=${projectId}-default-rtdb`;

type Session = { app: FirebaseApp; db: Database; uid: string };
const apps: FirebaseApp[] = [];

async function login(local: string): Promise<Session> {
  const app = initializeApp({ apiKey: "demo-key", projectId, databaseURL }, local);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getDatabase(app);
  connectDatabaseEmulator(db, "127.0.0.1", 9000);
  const cred = await signInWithEmailAndPassword(auth, `${local}@${DOMAIN}`, PASSWORD);
  return { app, db, uid: cred.user.uid };
}

let passed = 0;
let failed = 0;
async function expect(name: string, shouldSucceed: boolean, op: () => Promise<unknown>) {
  let ok: boolean;
  let detail = "";
  try {
    await op();
    ok = true;
  } catch (err) {
    ok = false;
    detail = (err as Error).message;
  }
  const good = ok === shouldSucceed;
  if (good) passed++;
  else failed++;
  console.log(`${good ? "✓" : "✗"} ${shouldSucceed ? "allow" : "deny "}  ${name}${good ? "" : `  (got ${ok ? "allowed" : `denied: ${detail}`})`}`);
}

function leadPayload(assignedTo: string, departmentId: string, createdBy: string, extra: Record<string, unknown> = {}) {
  return {
    name: "Rules Test Lead",
    email: "rules.test@example.com",
    phone: "+91 90000 00000",
    projectId: "project-a",
    departmentId,
    assignedTo,
    statusId: "new",
    sourceId: "website",
    subSourceId: "web-contact",
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    ...extra,
  };
}

async function createWithActivity(s: Session, assignedTo: string, departmentId: string) {
  const id = push(ref(s.db, "leads")).key!;
  const actId = push(ref(s.db, "activities")).key!;
  await update(ref(s.db), {
    [`leads/${id}`]: leadPayload(assignedTo, departmentId, s.uid),
    [`activities/${actId}`]: { leadId: id, departmentId, type: "lead_created", createdBy: s.uid, createdAt: serverTimestamp() },
  });
  return id;
}

async function main() {
  const admin = await login("admin");
  const priya = await login("priya.presales"); // presales, can create leads
  const rahul = await login("rahul.presales"); // presales, cannot create leads
  const sneha = await login("sneha.sales");
  const vikram = await login("vikram.sales");
  const meera = await login("meera.saleshead"); // sales department head

  const leadsRef = (s: Session) => ref(s.db, "leads");
  const allLeads = (await get(leadsRef(admin))).val() as Record<string, { assignedTo: string; departmentId: string }>;
  const leadOf = (uid: string) => Object.keys(allLeads).find((id) => allLeads[id].assignedTo === uid)!;
  const priyaLead = leadOf(priya.uid);
  const rahulLead = leadOf(rahul.uid);
  const snehaLead = leadOf(sneha.uid);

  console.log("\nReading leads");
  await expect("admin reads all leads", true, () => get(leadsRef(admin)));
  await expect("rep reads all leads", false, () => get(leadsRef(priya)));
  await expect("rep queries own leads", true, async () => {
    const snap = await get(query(leadsRef(priya), orderByChild("assignedTo"), equalTo(priya.uid)));
    snap.forEach((c) => {
      if (c.val().assignedTo !== priya.uid) throw new Error("leaked another user's lead");
    });
  });
  await expect("rep queries someone else's leads", false, () =>
    get(query(leadsRef(priya), orderByChild("assignedTo"), equalTo(rahul.uid))),
  );
  await expect("rep reads another rep's lead by id", false, () => get(ref(priya.db, `leads/${rahulLead}`)));
  await expect("dept head queries own department", true, () =>
    get(query(leadsRef(meera), orderByChild("departmentId"), equalTo("sales"))),
  );
  await expect("dept head queries another department", false, () =>
    get(query(leadsRef(meera), orderByChild("departmentId"), equalTo("presales"))),
  );

  console.log("\nActivities");
  const acts = (s: Session, leadId: string) => get(query(ref(s.db, "activities"), orderByChild("leadId"), equalTo(leadId)));
  await expect("rep reads own lead's timeline", true, () => acts(priya, priyaLead));
  await expect("rep reads another lead's timeline", false, () => acts(priya, rahulLead));
  await expect("dept head reads department feed", true, () =>
    get(query(ref(meera.db, "activities"), orderByChild("departmentId"), equalTo("sales"))),
  );
  await expect("rep reads global feed", false, () => get(ref(priya.db, "activities")));
  await expect("rep logs activity on own lead", true, () =>
    set(push(ref(priya.db, "activities")), { leadId: priyaLead, departmentId: "presales", type: "call_made", createdBy: priya.uid, createdAt: serverTimestamp() }),
  );
  await expect("rep logs activity on another's lead", false, () =>
    set(push(ref(priya.db, "activities")), { leadId: rahulLead, departmentId: "presales", type: "call_made", createdBy: priya.uid, createdAt: serverTimestamp() }),
  );
  await expect("rep forges activity author", false, () =>
    set(push(ref(priya.db, "activities")), { leadId: priyaLead, departmentId: "presales", type: "call_made", createdBy: rahul.uid, createdAt: serverTimestamp() }),
  );
  const existingAct = Object.keys((await acts(priya, priyaLead)).val())[0];
  await expect("rep edits an existing activity", false, () => update(ref(priya.db, `activities/${existingAct}`), { description: "tampered" }));

  console.log("\nCreating leads");
  await expect("rep with lead creation enabled creates self-assigned lead", true, () => createWithActivity(priya, priya.uid, "presales"));
  await expect("rep without lead creation creates lead", false, () => createWithActivity(rahul, rahul.uid, "presales"));
  await expect("rep creates lead assigned to someone else", false, () => createWithActivity(priya, rahul.uid, "presales"));
  await expect("rep creates lead for project they lack", false, async () => {
    const id = push(ref(vikram.db, "leads")).key!;
    await set(ref(vikram.db, `leads/${id}`), leadPayload(vikram.uid, "sales", vikram.uid));
  });
  await expect("dept head creates lead for their team", true, () => createWithActivity(meera, vikram.uid, "sales"));
  await expect("dept head creates lead in another department", false, () => createWithActivity(meera, priya.uid, "presales"));
  await expect("admin creates lead for anyone", true, () => createWithActivity(admin, rahul.uid, "presales"));
  await expect("invalid email is rejected even for admin", false, async () => {
    const id = push(ref(admin.db, "leads")).key!;
    await set(ref(admin.db, `leads/${id}`), leadPayload(rahul.uid, "presales", admin.uid, { email: "not-an-email" }));
  });
  await expect("unknown lead fields are rejected", false, async () => {
    const id = push(ref(admin.db, "leads")).key!;
    await set(ref(admin.db, `leads/${id}`), leadPayload(rahul.uid, "presales", admin.uid, { isVip: true }));
  });

  console.log("\nUpdating leads");
  await expect("rep changes status of own lead", true, () =>
    update(ref(priya.db, `leads/${priyaLead}`), { statusId: "contacted", updatedAt: serverTimestamp() }),
  );
  await expect("rep reassigns own lead", false, () => update(ref(priya.db, `leads/${priyaLead}`), { assignedTo: rahul.uid }));
  await expect("rep edits another rep's lead", false, () => update(ref(priya.db, `leads/${rahulLead}`), { statusId: "lost" }));
  await expect("rep deletes own lead", false, () => remove(ref(priya.db, `leads/${priyaLead}`)));
  await expect("dept head reassigns within department", true, () =>
    update(ref(meera.db, `leads/${snehaLead}`), { assignedTo: vikram.uid }),
  );
  await expect("dept head reassigns outside department", false, () =>
    update(ref(meera.db, `leads/${snehaLead}`), { assignedTo: priya.uid, departmentId: "presales" }),
  );
  await expect("admin reassigns across departments", true, () =>
    update(ref(admin.db, `leads/${snehaLead}`), { assignedTo: sneha.uid, departmentId: "sales" }),
  );

  console.log("\nUsers & master data");
  await expect("rep promotes self to admin", false, () => update(ref(priya.db, `users/${priya.uid}`), { role: "admin" }));
  await expect("rep enables own lead creation", false, () => update(ref(rahul.db, `users/${rahul.uid}`), { canCreateLeads: true }));
  await expect("rep edits own name", true, () => update(ref(priya.db, `users/${priya.uid}`), { fullName: "Priya Nair" }));
  await expect("rep edits another user's name", false, () => update(ref(priya.db, `users/${rahul.uid}`), { fullName: "x" }));
  await expect("rep reads master data", true, () => get(ref(priya.db, "leadStatuses")));
  await expect("rep creates a project", false, () =>
    set(push(ref(priya.db, "projects")), { name: "Rogue", entityId: "default-entity", status: "active", createdBy: priya.uid, createdAt: Date.now() }),
  );
  await expect("rep changes settings", false, () => update(ref(priya.db, "settings/app"), { defaultCanCreateLeads: true }));
  await expect("admin creates a source", true, () =>
    set(push(ref(admin.db, "sources")), { name: "Rules Test Source", status: "active", createdBy: admin.uid, createdAt: Date.now() }),
  );
  await expect("sub-source must reference a real source", false, () =>
    set(push(ref(admin.db, "subSources")), { name: "Orphan", sourceId: "nope", status: "active", createdBy: admin.uid, createdAt: Date.now() }),
  );

  console.log("\nNotifications");
  await expect("user reads own notifications", true, () => get(ref(priya.db, `notifications/${priya.uid}`)));
  await expect("user reads someone else's notifications", false, () => get(ref(priya.db, `notifications/${rahul.uid}`)));

  console.log(`\n${passed} passed, ${failed} failed`);
  await Promise.all(apps.map((a) => deleteApp(a)));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
