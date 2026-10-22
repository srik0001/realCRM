"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { createRecord, removeRecord, updateRecord } from "@/lib/database/crud";
import type { BaseRecord } from "@/types";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { errorMessage } from "@/utils/errors";
import { formatDate } from "@/utils/format";

export type FieldDef<V> = {
  name: Path<V>;
  label: string;
  type?: "text" | "textarea" | "select" | "number";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  hint?: string;
  fullWidth?: boolean;
};

export type Column<T> = { header: string; cell: (item: T) => ReactNode; className?: string };

type Props<T extends BaseRecord, V extends FieldValues> = {
  title: string;
  description: string;
  singular: string;
  path: string;
  items: T[];
  loading: boolean;
  error: string | null;
  columns: Column<T>[];
  fields: FieldDef<V>[];
  schema: z.ZodType<V, V>;
  toForm: (item?: T) => DefaultValues<V>;
  toRecord?: (values: V) => object;
  searchText: (item: T) => string;
  /** Number of records that reference this one; deletion is blocked when > 0. */
  usage?: (item: T) => number;
  usageLabel?: string;
};

export function CrudPage<T extends BaseRecord, V extends FieldValues>(props: Props<T, V>) {
  const { title, description, singular, path, items, loading, error, columns, searchText, usage } = props;
  const me = useCurrentUser();
  const [term, setTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!statusFilter || i.status === statusFilter) &&
          (!term.trim() || searchText(i).toLowerCase().includes(term.trim().toLowerCase())),
      ),
    [items, term, statusFilter, searchText],
  );

  const setStatus = async (item: T, next: "active" | "inactive") => {
    try {
      await updateRecord(path, item.id, { status: next });
      toast.success(`${singular} ${next === "active" ? "activated" : "deactivated"}`);
    } catch (err) {
      toast.error(`Could not update ${singular.toLowerCase()}`, { description: errorMessage(err) });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await removeRecord(path, deleting.id);
      toast.success(`${singular} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error(`Could not delete ${singular.toLowerCase()}`, { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
  const td = "px-4 py-3 text-sm text-slate-700";
  const deletingUsage = deleting && usage ? usage(deleting) : 0;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add {singular.toLowerCase()}</Button>}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row">
          <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="sm:max-w-xs" aria-label="Search" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="sm:w-40" aria-label="Status filter">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {loading ? (
          <TableSkeleton rows={4} cols={columns.length + 2} />
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? `No ${title.toLowerCase()} yet` : "Nothing matches your search"}
            action={items.length === 0 ? <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add {singular.toLowerCase()}</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  {columns.map((c) => <th key={c.header} className={th}>{c.header}</th>)}
                  <th className={th}>Status</th>
                  <th className={th}>Created</th>
                  <th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {columns.map((c) => <td key={c.header} className={c.className ?? td}>{c.cell(item)}</td>)}
                    <td className={td}><StatusPill active={item.status === "active"} /></td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(item.createdAt)}</td>
                    <td className="px-2 py-2 text-right">
                      <Dropdown
                        trigger={({ toggle }) => (
                          <button type="button" onClick={toggle} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      >
                        {(close) => (
                          <>
                            <MenuItem icon={<Pencil />} onClick={() => { close(); setEditing(item); }}>Edit</MenuItem>
                            <MenuItem icon={<Power />} onClick={() => { close(); setStatus(item, item.status === "active" ? "inactive" : "active"); }}>
                              {item.status === "active" ? "Deactivate" : "Activate"}
                            </MenuItem>
                            <MenuItem icon={<Trash2 />} danger onClick={() => { close(); setDeleting(item); }}>Delete</MenuItem>
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

      <RecordFormModal
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        item={editing === "new" ? undefined : editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (values) => {
          const record = props.toRecord ? props.toRecord(values) : values;
          if (editing && editing !== "new") await updateRecord(path, editing.id, record);
          else await createRecord(path, { status: "active", ...record }, me.id);
        }}
        {...props}
      />

      {deletingUsage > 0 ? (
        <ConfirmDialog
          open={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (deleting) await setStatus(deleting, "inactive");
            setDeleting(null);
          }}
          title={`${singular} is in use`}
          description={`It is referenced by ${deletingUsage} ${props.usageLabel ?? "records"}, so it can't be deleted. Deactivate it instead to hide it from new entries.`}
          confirmLabel="Deactivate instead"
        />
      ) : (
        <ConfirmDialog
          open={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
          danger
          loading={busy}
          title={`Delete ${singular.toLowerCase()}?`}
          description="This can't be undone."
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}

function RecordFormModal<T extends BaseRecord, V extends FieldValues>({
  open,
  item,
  onClose,
  onSave,
  singular,
  fields,
  schema,
  toForm,
}: Props<T, V> & { open: boolean; item?: T; onClose: () => void; onSave: (v: V) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<V>({ resolver: zodResolver(schema), defaultValues: toForm(item) });

  const submit = handleSubmit(async (values) => {
    try {
      await onSave(values);
      toast.success(`${singular} ${item ? "updated" : "created"}`);
      onClose();
    } catch (err) {
      toast.error(`Could not save ${singular.toLowerCase()}`, { description: errorMessage(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={submit} loading={isSubmitting}>{item ? "Save changes" : `Create ${singular.toLowerCase()}`}</Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {fields.map((f, i) => {
          const err = (errors as Record<string, { message?: string } | undefined>)[f.name]?.message;
          const id = `f-${f.name}`;
          return (
            <Field key={f.name} label={f.label} htmlFor={id} required={f.required} error={err} hint={f.hint}
              className={f.fullWidth || f.type === "textarea" ? "sm:col-span-2" : undefined}>
              {f.type === "textarea" ? (
                <Textarea id={id} rows={3} invalid={!!err} placeholder={f.placeholder} {...register(f.name)} />
              ) : f.type === "select" ? (
                <Select id={id} invalid={!!err} {...register(f.name)}>
                  {!f.required && <option value="">None</option>}
                  {f.required && <option value="">Select…</option>}
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input id={id} type={f.type === "number" ? "number" : "text"} autoFocus={i === 0} invalid={!!err}
                  placeholder={f.placeholder} {...register(f.name, f.type === "number" ? { valueAsNumber: true } : undefined)} />
              )}
            </Field>
          );
        })}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
