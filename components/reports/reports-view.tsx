"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useActivityFeed } from "@/hooks/use-activities";
import type { Lead } from "@/types";
import { ROLE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { downloadCSV } from "@/utils/csv";
import { followUpState } from "@/utils/leads";

type Row = { id: string; label: string; sub?: string; total: number; open: number; won: number; lost: number; overdue: number; activities?: number };

function pct(n: number, d: number) {
  return d ? `${Math.round((n / d) * 100)}%` : "—";
}

function ReportTable({ title, description, rows, loading, showActivities, filename }: {
  title: string; description: string; rows: Row[]; loading: boolean; showActivities?: boolean; filename: string;
}) {
  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
  const td = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap tabular-nums";
  const headers = ["Name", "Leads", "Open", "Won", "Lost", "Conversion", "Overdue follow-ups", ...(showActivities ? ["Activities"] : [])];
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        description={description}
        action={
          <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() =>
            downloadCSV(filename, headers, rows.map((r) => [r.label, r.total, r.open, r.won, r.lost, pct(r.won, r.total), r.overdue, ...(showActivities ? [r.activities ?? 0] : [])]))
          }>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      />
      {loading ? <TableSkeleton rows={4} /> : rows.length === 0 ? <EmptyState title="No data for this period" /> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>{headers.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-slate-900">{r.label}</p>
                    {r.sub && <p className="text-xs text-slate-500">{r.sub}</p>}
                  </td>
                  <td className={td}>{r.total}</td>
                  <td className={td}>{r.open}</td>
                  <td className={`${td} text-emerald-700`}>{r.won}</td>
                  <td className={`${td} text-red-600`}>{r.lost}</td>
                  <td className={td}>{pct(r.won, r.total)}</td>
                  <td className={td}>{r.overdue}</td>
                  {showActivities && <td className={td}>{r.activities ?? 0}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ReportsView() {
  const me = useCurrentUser();
  const { leads, statuses, users, sources, projects, departments } = useCrmData();
  const feed = useActivityFeed(5000);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [projectId, setProjectId] = useState("");

  const range = useMemo(() => ({
    from: from ? new Date(`${from}T00:00:00`).getTime() : 0,
    to: to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity,
  }), [from, to]);

  const inScope = useMemo(
    () => leads.items.filter((l) => l.createdAt >= range.from && l.createdAt <= range.to && (!projectId || l.projectId === projectId)),
    [leads.items, range, projectId],
  );

  const build = (group: (l: Lead) => string, label: (id: string) => { label: string; sub?: string }, seed: string[] = []) => {
    const map = new Map<string, Row>();
    const ensure = (id: string) => {
      if (!map.has(id)) map.set(id, { id, ...label(id), total: 0, open: 0, won: 0, lost: 0, overdue: 0, activities: 0 });
      return map.get(id)!;
    };
    seed.forEach(ensure);
    for (const l of inScope) {
      const r = ensure(group(l));
      const cat = statuses.byId[l.statusId]?.category ?? "open";
      r.total++;
      r[cat]++;
      if (followUpState(l, statuses.byId) === "overdue") r.overdue++;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  };

  const team = users.items.filter((u) => u.role !== "admin" && (me.role === "admin" || u.departmentId === me.departmentId));
  const userRows = build(
    (l) => l.assignedTo,
    (id) => ({ label: users.byId[id]?.fullName ?? "Unassigned", sub: users.byId[id] ? `${ROLE_LABELS[users.byId[id].role]} · ${departments.byId[users.byId[id].departmentId ?? ""]?.name ?? "—"}` : undefined }),
    team.map((u) => u.id),
  );
  // Activities logged by each user within the period.
  for (const a of feed.activities) {
    if (a.createdAt < range.from || a.createdAt > range.to) continue;
    const r = userRows.find((x) => x.id === a.createdBy);
    if (r) r.activities = (r.activities ?? 0) + 1;
  }

  const sourceRows = build((l) => l.sourceId, (id) => ({ label: sources.byId[id]?.name ?? "Unknown" }));
  const projectRows = build((l) => l.projectId, (id) => ({ label: projects.byId[id]?.name ?? "Unknown" }));
  const loading = leads.loading || statuses.loading;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Reports" description={me.role === "admin" ? "Company-wide performance" : "Your department's performance"} />
      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Leads created from</span>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">To</span>
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Project</span>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projects.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </label>
      </Card>
      <div className="space-y-6">
        <ReportTable title="Team performance" description="Leads owned and activities logged per user" rows={userRows} loading={loading || feed.loading} showActivities filename={`team-performance-${stamp}.csv`} />
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportTable title="Source performance" description="Which channels convert" rows={sourceRows} loading={loading} filename={`source-performance-${stamp}.csv`} />
          <ReportTable title="Project summary" description="Pipeline by project" rows={projectRows} loading={loading} filename={`project-summary-${stamp}.csv`} />
        </div>
      </div>
    </div>
  );
}
