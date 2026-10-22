"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useCrmData } from "@/lib/database/crm-data-context";
import { PATHS } from "@/lib/database/paths";
import type { Department, Entity, LeadStatus, Project, Source, SubSource } from "@/types";
import { Badge, BADGE_TONES } from "@/components/ui/badge";
import { CrudPage } from "./crud-page";

const name = (label: string) => z.string().trim().min(1, `${label} is required`).max(120, "Too long");
const desc = z.string().trim().max(500, "Must be 500 characters or fewer");

function countMap<T>(items: T[], key: (i: T) => string | undefined) {
  const m: Record<string, number> = {};
  for (const i of items) {
    const k = key(i);
    if (k) m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

const simpleSchema = z.object({ name: name("Name"), description: desc });
type SimpleValues = z.infer<typeof simpleSchema>;

export function EntitiesPage() {
  const { entities, projects } = useCrmData();
  const usage = useMemo(() => countMap(projects.items, (p) => p.entityId), [projects.items]);
  return (
    <CrudPage<Entity, SimpleValues>
      title="Entities"
      description="Companies or business units that own projects."
      singular="Entity"
      path={PATHS.entities}
      {...entities}
      schema={simpleSchema}
      columns={[
        { header: "Name", cell: (e) => <span className="font-medium text-slate-900">{e.name}</span> },
        { header: "Description", cell: (e) => e.description || "—", className: "px-4 py-3 text-sm text-slate-500 max-w-md" },
        { header: "Projects", cell: (e) => usage[e.id] ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Entity name", required: true, fullWidth: true },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      toForm={(e) => ({ name: e?.name ?? "", description: e?.description ?? "" })}
      searchText={(e) => `${e.name} ${e.description ?? ""}`}
      usage={(e) => usage[e.id] ?? 0}
      usageLabel="projects"
    />
  );
}

const projectSchema = z.object({
  name: name("Project name"),
  entityId: z.string().min(1, "Select an entity"),
  location: z.string().trim().max(160),
  description: desc,
});
type ProjectValues = z.infer<typeof projectSchema>;

export function ProjectsPage() {
  const { projects, entities, leads, users } = useCrmData();
  const leadUsage = useMemo(() => countMap(leads.items, (l) => l.projectId), [leads.items]);
  const userCount = useMemo(() => {
    const m: Record<string, number> = {};
    users.items.forEach((u) => Object.keys(u.projectIds ?? {}).forEach((p) => (m[p] = (m[p] ?? 0) + 1)));
    return m;
  }, [users.items]);
  return (
    <CrudPage<Project, ProjectValues>
      title="Projects"
      description="Real estate projects that leads are captured for."
      singular="Project"
      path={PATHS.projects}
      {...projects}
      schema={projectSchema}
      columns={[
        { header: "Project", cell: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
        { header: "Entity", cell: (p) => entities.byId[p.entityId]?.name ?? "—" },
        { header: "Location", cell: (p) => p.location || "—" },
        { header: "Leads", cell: (p) => leadUsage[p.id] ?? 0 },
        { header: "Users", cell: (p) => userCount[p.id] ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Project name", required: true },
        { name: "entityId", label: "Entity", type: "select", required: true,
          options: entities.items.filter((e) => e.status === "active").map((e) => ({ value: e.id, label: e.name })) },
        { name: "location", label: "Location", fullWidth: true },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      toForm={(p) => ({ name: p?.name ?? "", entityId: p?.entityId ?? entities.items[0]?.id ?? "", location: p?.location ?? "", description: p?.description ?? "" })}
      searchText={(p) => `${p.name} ${p.location ?? ""}`}
      usage={(p) => leadUsage[p.id] ?? 0}
      usageLabel="leads"
    />
  );
}

export function DepartmentsPage() {
  const { departments, leads, users } = useCrmData();
  const leadUsage = useMemo(() => countMap(leads.items, (l) => l.departmentId), [leads.items]);
  const userUsage = useMemo(() => countMap(users.items, (u) => u.departmentId), [users.items]);
  return (
    <CrudPage<Department, SimpleValues>
      title="Departments"
      description="Teams that work leads, such as Pre-Sales and Sales."
      singular="Department"
      path={PATHS.departments}
      {...departments}
      schema={simpleSchema}
      columns={[
        { header: "Department", cell: (d) => <span className="font-medium text-slate-900">{d.name}</span> },
        { header: "Description", cell: (d) => d.description || "—", className: "px-4 py-3 text-sm text-slate-500 max-w-md" },
        { header: "Users", cell: (d) => userUsage[d.id] ?? 0 },
        { header: "Leads", cell: (d) => leadUsage[d.id] ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Department name", required: true, fullWidth: true },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      toForm={(d) => ({ name: d?.name ?? "", description: d?.description ?? "" })}
      searchText={(d) => d.name}
      usage={(d) => (leadUsage[d.id] ?? 0) + (userUsage[d.id] ?? 0)}
      usageLabel="users or leads"
    />
  );
}

const statusSchema = z.object({
  name: name("Status name"),
  category: z.enum(["open", "won", "lost"]),
  color: z.string().min(1, "Pick a colour"),
  order: z.number({ message: "Enter a number" }).int("Whole numbers only").min(0).max(999),
});
type StatusValues = z.infer<typeof statusSchema>;

export function StatusesPage() {
  const { statuses, leads } = useCrmData();
  const usage = useMemo(() => countMap(leads.items, (l) => l.statusId), [leads.items]);
  return (
    <CrudPage<LeadStatus, StatusValues>
      title="Lead Statuses"
      description="Pipeline stages. The category decides whether a status counts as open, won or lost."
      singular="Status"
      path={PATHS.leadStatuses}
      {...statuses}
      schema={statusSchema}
      columns={[
        { header: "Order", cell: (s) => <span className="tabular-nums">{s.order}</span> },
        { header: "Status", cell: (s) => <Badge tone={s.color}>{s.name}</Badge> },
        { header: "Category", cell: (s) => s.category[0].toUpperCase() + s.category.slice(1) },
        { header: "Leads", cell: (s) => usage[s.id] ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Status name", required: true },
        { name: "order", label: "Display order", type: "number", required: true },
        { name: "category", label: "Category", type: "select", required: true,
          options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }, { value: "lost", label: "Lost" }] },
        { name: "color", label: "Badge colour", type: "select", required: true,
          options: BADGE_TONES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) })) },
      ]}
      toForm={(s) => ({
        name: s?.name ?? "",
        category: s?.category ?? "open",
        color: s?.color ?? "blue",
        order: s?.order ?? (statuses.items.at(-1)?.order ?? 0) + 1,
      })}
      searchText={(s) => s.name}
      usage={(s) => usage[s.id] ?? 0}
      usageLabel="leads"
    />
  );
}

export function SourcesPage() {
  const { sources, subSources, leads } = useCrmData();
  const leadUsage = useMemo(() => countMap(leads.items, (l) => l.sourceId), [leads.items]);
  const subUsage = useMemo(() => countMap(subSources.items, (s) => s.sourceId), [subSources.items]);
  return (
    <CrudPage<Source, SimpleValues>
      title="Sources"
      description="Where leads come from."
      singular="Source"
      path={PATHS.sources}
      {...sources}
      schema={simpleSchema}
      columns={[
        { header: "Source", cell: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
        { header: "Sub-sources", cell: (s) => subUsage[s.id] ?? 0 },
        { header: "Leads", cell: (s) => leadUsage[s.id] ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Source name", required: true, fullWidth: true },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      toForm={(s) => ({ name: s?.name ?? "", description: s?.description ?? "" })}
      searchText={(s) => s.name}
      usage={(s) => (leadUsage[s.id] ?? 0) + (subUsage[s.id] ?? 0)}
      usageLabel="sub-sources or leads"
    />
  );
}

const subSourceSchema = z.object({ name: name("Sub-source name"), sourceId: z.string().min(1, "Select a source"), description: desc });
type SubSourceValues = z.infer<typeof subSourceSchema>;

export function SubSourcesPage() {
  const { subSources, sources, leads } = useCrmData();
  const usage = useMemo(() => countMap(leads.items, (l) => l.subSourceId), [leads.items]);
  return (
    <CrudPage<SubSource, SubSourceValues>
      title="Sub-Sources"
      description="Finer-grained channels within a source, e.g. Facebook › Meta Lead Form."
      singular="Sub-source"
      path={PATHS.subSources}
      {...subSources}
      schema={subSourceSchema}
      columns={[
        { header: "Sub-source", cell: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
        { header: "Source", cell: (s) => sources.byId[s.sourceId]?.name ?? "—" },
        { header: "Leads", cell: (s) => usage[s.id] ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Sub-source name", required: true },
        { name: "sourceId", label: "Source", type: "select", required: true,
          options: sources.items.filter((s) => s.status === "active").map((s) => ({ value: s.id, label: s.name })) },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      toForm={(s) => ({ name: s?.name ?? "", sourceId: s?.sourceId ?? "", description: s?.description ?? "" })}
      searchText={(s) => `${s.name} ${sources.byId[s.sourceId]?.name ?? ""}`}
      usage={(s) => usage[s.id] ?? 0}
      usageLabel="leads"
    />
  );
}
