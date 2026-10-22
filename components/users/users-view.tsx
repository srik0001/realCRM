"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { usersApi } from "@/lib/database/users";
import { userSchema, type UserFormValues } from "@/lib/validation";
import { ROLE_LABELS, type Role, type UserProfile } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { errorMessage } from "@/utils/errors";
import { formatDate } from "@/utils/format";

function profileToForm(u?: UserProfile, defaultCanCreate = false): UserFormValues {
  return {
    fullName: u?.fullName ?? "",
    email: u?.email ?? "",
    phone: u?.phone ?? "",
    role: u?.role ?? "presales",
    departmentId: u?.departmentId ?? "",
    projectIds: Object.keys(u?.projectIds ?? {}),
    status: u?.status ?? "active",
    canCreateLeads: u?.canCreateLeads ?? defaultCanCreate,
    password: "",
  };
}

export function UsersView() {
  const me = useCurrentUser();
  const { users, departments, projects, leads, settings } = useCrmData();
  const [term, setTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [editing, setEditing] = useState<UserProfile | "new" | null>(null);
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);

  const leadCounts = useMemo(() => {
    const m: Record<string, number> = {};
    leads.items.forEach((l) => (m[l.assignedTo] = (m[l.assignedTo] ?? 0) + 1));
    return m;
  }, [leads.items]);

  const filtered = users.items.filter(
    (u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!term.trim() || `${u.fullName} ${u.email} ${u.phone ?? ""}`.toLowerCase().includes(term.trim().toLowerCase())),
  );

  const setStatus = async (u: UserProfile, status: "active" | "inactive") => {
    try {
      await usersApi.update(u.id, { ...profileToForm(u), status });
      toast.success(`${u.fullName} ${status === "active" ? "activated" : "deactivated"}`);
    } catch (err) {
      toast.error("Could not update user", { description: errorMessage(err) });
    }
  };

  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
  const td = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

  return (
    <div>
      <PageHeader
        title="Users"
        description="Create logins, set roles and departments, and control project access."
        actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add user</Button>}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row">
          <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search users" className="sm:max-w-xs" aria-label="Search users" />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "")} className="sm:w-48" aria-label="Role filter">
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </div>
        {users.loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : users.error ? (
          <ErrorState message={users.error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className={th}>User</th>
                  <th className={th}>Role</th>
                  <th className={th}>Department</th>
                  <th className={th}>Projects</th>
                  <th className={th}>Leads</th>
                  <th className={th}>Can create leads</th>
                  <th className={th}>Status</th>
                  <th className={th}>Created</th>
                  <th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} />
                        <div>
                          <p className="font-medium text-slate-900">{u.fullName}{u.id === me.id && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}</p>
                          <p className="text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className={td}><Badge tone={u.role === "admin" ? "violet" : u.role === "dept_head" ? "amber" : "blue"}>{ROLE_LABELS[u.role]}</Badge></td>
                    <td className={td}>{departments.byId[u.departmentId ?? ""]?.name ?? "—"}</td>
                    <td className={td}>
                      {u.role === "admin" ? "All" : Object.keys(u.projectIds ?? {}).map((p) => projects.byId[p]?.name).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className={td}>{leadCounts[u.id] ?? 0}</td>
                    <td className={td}>{u.role === "admin" || u.role === "dept_head" ? "Yes (role)" : u.canCreateLeads ? "Yes" : "No"}</td>
                    <td className={td}><StatusPill active={u.status === "active"} /></td>
                    <td className={td}>{formatDate(u.createdAt)}</td>
                    <td className="px-2 py-2 text-right">
                      <Dropdown trigger={({ toggle }) => (
                        <button type="button" onClick={toggle} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Actions for ${u.fullName}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}>
                        {(close) => (
                          <>
                            <MenuItem icon={<Pencil />} onClick={() => { close(); setEditing(u); }}>Edit</MenuItem>
                            {u.id !== me.id && (
                              <>
                                <MenuItem icon={<Power />} onClick={() => { close(); setStatus(u, u.status === "active" ? "inactive" : "active"); }}>
                                  {u.status === "active" ? "Deactivate" : "Activate"}
                                </MenuItem>
                                <MenuItem icon={<Trash2 />} danger onClick={() => { close(); setDeleting(u); }}>Delete</MenuItem>
                              </>
                            )}
                          </>
                        )}
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserFormDrawer
        open={editing !== null}
        user={editing === "new" ? undefined : editing ?? undefined}
        defaultCanCreate={settings.defaultCanCreateLeads ?? false}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        danger
        loading={busy}
        title="Delete user?"
        description={
          deleting && leadCounts[deleting.id]
            ? `${deleting.fullName} has ${leadCounts[deleting.id]} assigned leads. Reassign them first, or deactivate the user instead.`
            : `${deleting?.fullName}'s login will be removed permanently. Their past activity stays on lead timelines.`
        }
        confirmLabel="Delete user"
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await usersApi.remove(deleting.id);
            toast.success("User deleted");
            setDeleting(null);
          } catch (err) {
            toast.error("Could not delete user", { description: errorMessage(err) });
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function UserFormDrawer({
  open,
  user,
  defaultCanCreate,
  onClose,
}: {
  open: boolean;
  user?: UserProfile;
  defaultCanCreate: boolean;
  onClose: () => void;
}) {
  const me = useCurrentUser();
  const { departments, projects } = useCrmData();
  const isNew = !user;
  const form = useForm<UserFormValues>({ resolver: zodResolver(userSchema), defaultValues: profileToForm(user, defaultCanCreate) });
  const { register, handleSubmit, reset, control, setError, formState: { errors, isSubmitting } } = form;
  const role = useWatch({ control, name: "role" });

  useEffect(() => {
    if (open) reset(profileToForm(user, defaultCanCreate));
  }, [open, user, defaultCanCreate, reset]);

  const submit = handleSubmit(async (values) => {
    if (values.role !== "admin" && !values.departmentId) {
      return setError("departmentId", { message: "Department is required for this role" });
    }
    if (isNew && values.password.length < 8) {
      return setError("password", { message: "Password must be at least 8 characters" });
    }
    if (!isNew && values.password && values.password.length < 8) {
      return setError("password", { message: "Password must be at least 8 characters" });
    }
    try {
      if (isNew) await usersApi.create(values);
      else await usersApi.update(user.id, values);
      toast.success(isNew ? "User created" : "User updated", { description: values.fullName });
      onClose();
    } catch (err) {
      toast.error(isNew ? "Could not create user" : "Could not update user", { description: errorMessage(err) });
    }
  });

  const isSelf = user?.id === me.id;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isNew ? "Add user" : "Edit user"}
      description={user?.email}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={submit} loading={isSubmitting}>{isNew ? "Create user" : "Save changes"}</Button>
        </div>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="u-name" required error={errors.fullName?.message}>
          <Input id="u-name" invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="u-email" required error={errors.email?.message}>
            <Input id="u-email" type="email" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Phone number" htmlFor="u-phone" error={errors.phone?.message}>
            <Input id="u-phone" type="tel" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label="Role" htmlFor="u-role" required error={errors.role?.message}>
            <Select id="u-role" disabled={isSelf} {...register("role")}>
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </Field>
          <Field label="Department" htmlFor="u-dept" required={role !== "admin"} error={errors.departmentId?.message}>
            <Select id="u-dept" invalid={!!errors.departmentId} {...register("departmentId")}>
              <option value="">{role === "admin" ? "None" : "Select department"}</option>
              {departments.items.filter((d) => d.status === "active" || d.id === user?.departmentId).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="u-status">
            <Select id="u-status" disabled={isSelf} {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field
            label={isNew ? "Password" : "New password"}
            htmlFor="u-pass"
            required={isNew}
            error={errors.password?.message}
            hint={isNew ? "At least 8 characters. Share it with the user securely." : "Leave blank to keep the current password."}
          >
            <Input id="u-pass" type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
          </Field>
        </div>

        {role !== "admin" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Assigned projects</legend>
            <p className="text-xs text-slate-500">The user can be assigned leads for these projects.</p>
            <Controller
              control={control}
              name="projectIds"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {projects.items.map((p) => {
                    const checked = field.value.includes(p.id);
                    return (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                          checked={checked}
                          onChange={() => field.onChange(checked ? field.value.filter((id) => id !== p.id) : [...field.value, p.id])}
                        />
                        <span>{p.name}</span>
                        {p.status === "inactive" && <span className="text-xs text-slate-400">(inactive)</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </fieldset>
        )}

        {(role === "presales" || role === "sales") && (
          <Controller
            control={control}
            name="canCreateLeads"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Allow creating leads</p>
                  <p className="text-xs text-slate-500">New leads they create are assigned to themselves.</p>
                </div>
                <Switch checked={field.value} onChange={field.onChange} label="Allow creating leads" />
              </div>
            )}
          />
        )}
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
