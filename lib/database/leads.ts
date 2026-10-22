import { get, orderByChild, push, query, ref, equalTo, serverTimestamp, update } from "firebase/database";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/database/paths";
import type { ActivityType, Lead, LeadStatus, UserProfile } from "@/types";
import { compactForCreate, compactForUpdate } from "@/utils/object";

/** Editable lead fields, as captured by the lead form. */
export type LeadInput = Omit<Lead, "id" | "createdBy" | "createdAt" | "updatedAt" | "lastActivityAt">;

type Updates = Record<string, unknown>;

function newKey(path: string): string {
  return push(ref(db, path)).key!;
}

function activityUpdate(
  updates: Updates,
  lead: Pick<Lead, "id" | "departmentId">,
  actorId: string,
  type: ActivityType,
  extra: { description?: string; oldStatusId?: string; newStatusId?: string; oldAssignedTo?: string; newAssignedTo?: string } = {},
) {
  const id = newKey(PATHS.activities);
  updates[`${PATHS.activities}/${id}`] = compactForCreate({
    leadId: lead.id,
    departmentId: lead.departmentId,
    type,
    ...extra,
    createdBy: actorId,
    createdAt: serverTimestamp(),
  });
}

function notifyUpdate(updates: Updates, userId: string, actorId: string, title: string, body: string, leadId: string) {
  if (!userId || userId === actorId) return;
  const id = newKey(`${PATHS.notifications}/${userId}`);
  updates[`${PATHS.notifications}/${userId}/${id}`] = {
    title,
    body,
    leadId,
    read: false,
    createdBy: actorId,
    createdAt: serverTimestamp(),
  };
}

export async function createLead(input: LeadInput, actor: UserProfile): Promise<string> {
  const id = newKey(PATHS.leads);
  const updates: Updates = {};
  updates[`${PATHS.leads}/${id}`] = {
    ...compactForCreate(input),
    createdBy: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  };
  const lead = { id, departmentId: input.departmentId };
  activityUpdate(updates, lead, actor.id, "lead_created", {
    description: input.remarks || "Lead created",
    newStatusId: input.statusId,
  });
  if (input.assignedTo !== actor.id) {
    activityUpdate(updates, lead, actor.id, "assigned", { newAssignedTo: input.assignedTo });
  }
  notifyUpdate(updates, input.assignedTo, actor.id, "New lead assigned", `${input.name} was assigned to you`, id);
  await update(ref(db), updates);
  return id;
}

/** Update descriptive fields. Status and assignment have dedicated functions so they get logged. */
export async function updateLead(
  lead: Lead,
  input: Omit<LeadInput, "statusId" | "assignedTo" | "departmentId">,
  actor: UserProfile,
): Promise<void> {
  const updates: Updates = {};
  for (const [k, v] of Object.entries(compactForUpdate(input))) {
    updates[`${PATHS.leads}/${lead.id}/${k}`] = v;
  }
  updates[`${PATHS.leads}/${lead.id}/updatedAt`] = serverTimestamp();
  updates[`${PATHS.leads}/${lead.id}/lastActivityAt`] = serverTimestamp();
  activityUpdate(updates, lead, actor.id, "other", { description: "Lead details updated" });
  await update(ref(db), updates);
}

export async function changeLeadStatus(
  lead: Lead,
  newStatus: LeadStatus,
  actor: UserProfile,
  opts: { remarks?: string; followUpDate?: string } = {},
): Promise<void> {
  if (newStatus.id === lead.statusId && (opts.followUpDate ?? lead.followUpDate ?? "") === (lead.followUpDate ?? "")) return;
  const updates: Updates = {};
  const base = `${PATHS.leads}/${lead.id}`;
  updates[`${base}/statusId`] = newStatus.id;
  updates[`${base}/updatedAt`] = serverTimestamp();
  updates[`${base}/lastActivityAt`] = serverTimestamp();
  if (opts.followUpDate !== undefined) updates[`${base}/followUpDate`] = opts.followUpDate || null;

  if (newStatus.id === lead.statusId) {
    // Only the follow-up date changed.
    activityUpdate(updates, lead, actor.id, "follow_up", {
      description: opts.remarks || (opts.followUpDate ? `Follow-up set for ${opts.followUpDate}` : "Follow-up cleared"),
    });
  } else {
    const type: ActivityType =
      newStatus.category === "won" ? "lead_won" : newStatus.category === "lost" ? "lead_lost" : "status_changed";
    activityUpdate(updates, lead, actor.id, type, {
      description: opts.remarks,
      oldStatusId: lead.statusId,
      newStatusId: newStatus.id,
    });
  }
  await update(ref(db), updates);
}

export async function assignLead(
  lead: Lead,
  assignee: UserProfile,
  actor: UserProfile,
  remarks?: string,
): Promise<void> {
  if (assignee.id === lead.assignedTo) return;
  const updates: Updates = {};
  const base = `${PATHS.leads}/${lead.id}`;
  const departmentId = assignee.departmentId || lead.departmentId;
  updates[`${base}/assignedTo`] = assignee.id;
  updates[`${base}/departmentId`] = departmentId;
  updates[`${base}/updatedAt`] = serverTimestamp();
  updates[`${base}/lastActivityAt`] = serverTimestamp();
  activityUpdate(updates, { id: lead.id, departmentId }, actor.id, lead.assignedTo ? "reassigned" : "assigned", {
    description: remarks,
    oldAssignedTo: lead.assignedTo,
    newAssignedTo: assignee.id,
  });
  notifyUpdate(updates, assignee.id, actor.id, "Lead assigned to you", `${lead.name} was assigned to you`, lead.id);
  await update(ref(db), updates);
}

export async function addLeadActivity(
  lead: Lead,
  type: ActivityType,
  actor: UserProfile,
  opts: { description?: string; followUpDate?: string } = {},
): Promise<void> {
  const updates: Updates = {};
  const base = `${PATHS.leads}/${lead.id}`;
  updates[`${base}/lastActivityAt`] = serverTimestamp();
  updates[`${base}/updatedAt`] = serverTimestamp();
  if (opts.followUpDate) updates[`${base}/followUpDate`] = opts.followUpDate;
  activityUpdate(updates, lead, actor.id, type, { description: opts.description });
  await update(ref(db), updates);
}

/** Admin only: removes the lead and its whole activity history atomically. */
export async function deleteLead(lead: Lead): Promise<void> {
  const snap = await get(query(ref(db, PATHS.activities), orderByChild("leadId"), equalTo(lead.id)));
  const updates: Updates = { [`${PATHS.leads}/${lead.id}`]: null };
  snap.forEach((child) => {
    updates[`${PATHS.activities}/${child.key}`] = null;
  });
  await update(ref(db), updates);
}
