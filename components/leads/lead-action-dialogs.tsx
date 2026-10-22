"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { assignableUsers } from "@/lib/auth/permissions";
import { addLeadActivity, assignLead, changeLeadStatus, deleteLead } from "@/lib/database/leads";
import { MANUAL_ACTIVITY_TYPES, type ActivityType, type Lead } from "@/types";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { errorMessage } from "@/utils/errors";
import { ACTIVITY_META } from "./activity-meta";

export type LeadAction = "assign" | "status" | "activity" | "delete" | "edit";

export function AssignLeadDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const me = useCurrentUser();
  const { users, departments } = useCrmData();
  const [departmentId, setDepartmentId] = useState("");
  const [userId, setUserId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever a different lead is opened.
  const [forLead, setForLead] = useState<Lead | null>(null);
  if (lead && lead !== forLead) {
    setForLead(lead);
    setDepartmentId(me.role === "dept_head" ? me.departmentId ?? "" : lead.departmentId);
    setUserId("");
    setRemarks("");
    setError(null);
  }

  const options = useMemo(
    () => (lead ? assignableUsers(me, users.items, { departmentId, projectId: lead.projectId }) : []),
    [me, users.items, departmentId, lead],
  );

  const submit = async () => {
    if (!lead) return;
    const assignee = users.byId[userId];
    if (!assignee) return setError("Select a user to assign this lead to.");
    setSaving(true);
    try {
      await assignLead(lead, assignee, me, remarks.trim() || undefined);
      toast.success(`Lead assigned to ${assignee.fullName}`);
      onClose();
    } catch (err) {
      toast.error("Could not assign lead", { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title={lead?.assignedTo ? "Reassign lead" : "Assign lead"}
      description={lead ? `Currently: ${users.byId[lead.assignedTo]?.fullName ?? "Unassigned"}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Assign</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Department" htmlFor="assign-dept">
          <Select
            id="assign-dept"
            value={departmentId}
            disabled={me.role !== "admin"}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setUserId("");
            }}
          >
            {departments.items.filter((d) => d.status === "active").map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Assign to"
          htmlFor="assign-user"
          required
          error={error ?? undefined}
          hint={options.length === 0 ? "No active users in this department have access to the lead's project." : undefined}
        >
          <Select id="assign-user" value={userId} invalid={!!error} onChange={(e) => { setUserId(e.target.value); setError(null); }}>
            <option value="">Select user</option>
            {options.map((u) => (
              <option key={u.id} value={u.id} disabled={u.id === lead?.assignedTo}>
                {u.fullName}{u.id === lead?.assignedTo ? " (current)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Remarks" htmlFor="assign-remarks">
          <Textarea id="assign-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function ChangeStatusDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const me = useCurrentUser();
  const { statuses } = useCrmData();
  const [statusId, setStatusId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [forLead, setForLead] = useState<Lead | null>(null);
  if (lead && lead !== forLead) {
    setForLead(lead);
    setStatusId(lead.statusId);
    setRemarks("");
    setFollowUpDate(lead.followUpDate ?? "");
    setError(null);
  }

  const submit = async () => {
    if (!lead) return;
    const status = statuses.byId[statusId];
    if (!status) return setError("Select a status.");
    if (status.id === lead.statusId && followUpDate === (lead.followUpDate ?? "")) {
      return setError("Choose a different status or follow-up date.");
    }
    setSaving(true);
    try {
      await changeLeadStatus(lead, status, me, { remarks: remarks.trim() || undefined, followUpDate });
      toast.success(`Status changed to ${status.name}`);
      onClose();
    } catch (err) {
      toast.error("Could not change status", { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Change status"
      description={lead ? `Current: ${statuses.byId[lead.statusId]?.name ?? "—"}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Update status</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="New status" htmlFor="status-select" required error={error ?? undefined}>
          <Select id="status-select" value={statusId} invalid={!!error} onChange={(e) => { setStatusId(e.target.value); setError(null); }}>
            {statuses.items.filter((s) => s.status === "active" || s.id === lead?.statusId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Next follow-up" htmlFor="status-followup">
          <Input id="status-followup" type="date" value={followUpDate} onChange={(e) => { setFollowUpDate(e.target.value); setError(null); }} />
        </Field>
        <Field label="Remarks" htmlFor="status-remarks">
          <Textarea id="status-remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Inline form used on the lead page and in the "Add activity" dialog. */
export function AddActivityForm({ lead, onDone, compact }: { lead: Lead; onDone?: () => void; compact?: boolean }) {
  const me = useCurrentUser();
  const [type, setType] = useState<ActivityType>("call_made");
  const [description, setDescription] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && (type === "note_added" || type === "other")) {
      return setError("Add a description for this activity.");
    }
    if (type === "follow_up" && !followUpDate) return setError("Pick a follow-up date.");
    setSaving(true);
    try {
      await addLeadActivity(lead, type, me, { description: description.trim() || undefined, followUpDate: followUpDate || undefined });
      toast.success(`${ACTIVITY_META[type].label} logged`);
      setDescription("");
      setFollowUpDate("");
      setError(null);
      onDone?.();
    } catch (err) {
      toast.error("Could not add activity", { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className={compact ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
        <Field label="Activity type" htmlFor={`act-type-${lead.id}`} required>
          <Select id={`act-type-${lead.id}`} value={type} onChange={(e) => { setType(e.target.value as ActivityType); setError(null); }}>
            {MANUAL_ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{ACTIVITY_META[t].label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Next follow-up" htmlFor={`act-fu-${lead.id}`} required={type === "follow_up"}>
          <Input id={`act-fu-${lead.id}`} type="date" value={followUpDate} onChange={(e) => { setFollowUpDate(e.target.value); setError(null); }} />
        </Field>
      </div>
      <Field label="Description / remarks" htmlFor={`act-desc-${lead.id}`} error={error ?? undefined}>
        <Textarea
          id={`act-desc-${lead.id}`}
          rows={3}
          value={description}
          invalid={!!error}
          maxLength={2000}
          onChange={(e) => { setDescription(e.target.value); setError(null); }}
          placeholder="What happened?"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>Add activity</Button>
      </div>
    </form>
  );
}

export function AddActivityDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  return (
    <Modal open={!!lead} onClose={onClose} title="Add activity" description={lead?.name}>
      {lead && <AddActivityForm lead={lead} onDone={onClose} />}
    </Modal>
  );
}

export function DeleteLeadDialog({ lead, onClose, onDeleted }: { lead: Lead | null; onClose: () => void; onDeleted?: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <ConfirmDialog
      open={!!lead}
      onClose={onClose}
      danger
      loading={saving}
      title="Delete lead?"
      description={lead ? `${lead.name} and its entire activity history will be permanently deleted.` : undefined}
      confirmLabel="Delete lead"
      onConfirm={async () => {
        if (!lead) return;
        setSaving(true);
        try {
          await deleteLead(lead);
          toast.success("Lead deleted");
          onClose();
          onDeleted?.();
        } catch (err) {
          toast.error("Could not delete lead", { description: errorMessage(err) });
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
