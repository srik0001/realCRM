"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { assignableUsers } from "@/lib/auth/permissions";
import { emptyLeadForm, leadSchema, type LeadFormValues } from "@/lib/validation";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export type LeadFormMode = "create" | "edit";

/**
 * Lead create/edit form. In edit mode, status, department and assignment are
 * read-only here because they change through dedicated, logged actions.
 */
export function useLeadForm(defaults?: Partial<LeadFormValues>) {
  return useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { ...emptyLeadForm, ...defaults },
    mode: "onTouched",
  });
}

export function LeadFormFields({
  form,
  mode,
}: {
  form: ReturnType<typeof useLeadForm>;
  mode: LeadFormMode;
}) {
  const me = useCurrentUser();
  const { projects, departments, users, statuses, sources, subSources } = useCrmData();
  const {
    register,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = form;

  const [projectId, departmentId, sourceId] = useWatch({ control, name: ["projectId", "departmentId", "sourceId"] });

  const isAdmin = me.role === "admin";
  const isHead = me.role === "dept_head";
  const lockDepartment = mode === "edit" || !isAdmin;
  const lockAssignee = mode === "edit" || (!isAdmin && !isHead);

  const activeProjects = projects.items.filter(
    (p) => p.status === "active" && (isAdmin || isHead || me.projectIds?.[p.id]),
  );
  const activeDepartments = departments.items.filter((d) => d.status === "active");
  const activeStatuses = statuses.items.filter((s) => s.status === "active");
  const activeSources = sources.items.filter((s) => s.status === "active");
  const filteredSubSources = subSources.items.filter((s) => s.status === "active" && s.sourceId === sourceId);

  const assignees = useMemo(
    () => assignableUsers(me, users.items, { departmentId, projectId }),
    [me, users.items, departmentId, projectId],
  );

  // Sensible defaults for a new lead: own department, first status, self-assignment for reps.
  useEffect(() => {
    if (mode !== "create") return;
    if (!getValues("departmentId") && me.departmentId) setValue("departmentId", me.departmentId);
    if (!getValues("statusId") && activeStatuses[0]) setValue("statusId", activeStatuses[0].id);
    if (lockAssignee && !getValues("assignedTo")) setValue("assignedTo", me.id);
  }, [mode, me, activeStatuses, lockAssignee, getValues, setValue]);

  // Clear an assignee who no longer matches the selected department/project.
  useEffect(() => {
    if (mode !== "create" || lockAssignee) return;
    const current = getValues("assignedTo");
    if (current && !assignees.some((u) => u.id === current)) setValue("assignedTo", "");
  }, [assignees, mode, lockAssignee, getValues, setValue]);

  // Sub-source belongs to a source; reset it when the source changes.
  useEffect(() => {
    const current = getValues("subSourceId");
    if (current && !filteredSubSources.some((s) => s.id === current)) setValue("subSourceId", "");
  }, [filteredSubSources, getValues, setValue]);

  const assigneeOptions = mode === "edit" ? users.items : lockAssignee ? [me] : assignees;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
        <Field label="Lead Name" htmlFor="lead-name" required error={errors.name?.message}>
          <Input id="lead-name" autoFocus={mode === "create"} invalid={!!errors.name} {...register("name")} placeholder="e.g. Ananya Sharma" />
        </Field>
        <Field label="Email" htmlFor="lead-email" required error={errors.email?.message}>
          <Input id="lead-email" type="email" invalid={!!errors.email} {...register("email")} placeholder="name@example.com" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone Number" htmlFor="lead-phone" required error={errors.phone?.message}>
            <Input id="lead-phone" type="tel" inputMode="tel" invalid={!!errors.phone} {...register("phone")} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Alternate Phone" htmlFor="lead-alt" error={errors.altPhone?.message}>
            <Input id="lead-alt" type="tel" inputMode="tel" invalid={!!errors.altPhone} {...register("altPhone")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" htmlFor="lead-project" required error={errors.projectId?.message}>
            <Select id="lead-project" invalid={!!errors.projectId} {...register("projectId")}>
              <option value="">Select project</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Department" htmlFor="lead-dept" required error={errors.departmentId?.message}>
            <Select id="lead-dept" disabled={lockDepartment} invalid={!!errors.departmentId} {...register("departmentId")}>
              <option value="">Select department</option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Assigned User"
            htmlFor="lead-assignee"
            required
            error={errors.assignedTo?.message}
            hint={
              mode === "create" && !lockAssignee && (!departmentId || !projectId)
                ? "Choose a project and department first"
                : mode === "create" && !lockAssignee && assignees.length === 0
                  ? "No active users in this department have access to this project"
                  : undefined
            }
          >
            <Select id="lead-assignee" disabled={lockAssignee} invalid={!!errors.assignedTo} {...register("assignedTo")}>
              <option value="">Select user</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lead Status" htmlFor="lead-status" required error={errors.statusId?.message}>
            <Select id="lead-status" disabled={mode === "edit"} invalid={!!errors.statusId} {...register("statusId")}>
              <option value="">Select status</option>
              {(mode === "edit" ? statuses.items : activeStatuses).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="lead-source" required error={errors.sourceId?.message}>
            <Select id="lead-source" invalid={!!errors.sourceId} {...register("sourceId")}>
              <option value="">Select source</option>
              {activeSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Sub-Source" htmlFor="lead-subsource" error={errors.subSourceId?.message}>
            <Select id="lead-subsource" disabled={!sourceId || filteredSubSources.length === 0} {...register("subSourceId")}>
              <option value="">{sourceId ? "None" : "Select a source first"}</option>
              {filteredSubSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        {mode === "edit" && (
          <p className="text-xs text-slate-500">Use “Change status” and “Assign” on the lead to update status or owner.</p>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirement</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred Location" htmlFor="lead-location" error={errors.preferredLocation?.message}>
            <Input id="lead-location" {...register("preferredLocation")} placeholder="e.g. Whitefield" />
          </Field>
          <Field label="Budget" htmlFor="lead-budget" error={errors.budget?.message}>
            <Input id="lead-budget" {...register("budget")} placeholder="e.g. ₹80L – 1Cr" />
          </Field>
          <Field label="Follow-up Date" htmlFor="lead-followup" error={errors.followUpDate?.message}>
            <Input id="lead-followup" type="date" invalid={!!errors.followUpDate} {...register("followUpDate")} />
          </Field>
        </div>
        <Field label="Requirement / Notes" htmlFor="lead-notes" error={errors.notes?.message}>
          <Textarea id="lead-notes" rows={3} {...register("notes")} placeholder="2BHK, east facing, ready to move…" />
        </Field>
        <Field label="Remarks" htmlFor="lead-remarks" error={errors.remarks?.message}>
          <Textarea id="lead-remarks" rows={2} {...register("remarks")} />
        </Field>
      </section>
    </div>
  );
}

/** Convert validated form values into the persisted lead shape. */
export function formToLeadInput(v: LeadFormValues) {
  return {
    ...v,
    altPhone: v.altPhone || undefined,
    subSourceId: v.subSourceId || undefined,
    remarks: v.remarks || undefined,
    followUpDate: v.followUpDate || undefined,
    preferredLocation: v.preferredLocation || undefined,
    budget: v.budget || undefined,
    notes: v.notes || undefined,
  };
}
