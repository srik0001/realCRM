"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  Plus,
  Radio,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useActivityFeed } from "@/hooks/use-activities";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PanelHeader } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { LeadFiltersBar } from "@/components/leads/lead-filters";
import { LeadTable } from "@/components/leads/lead-table";
import { StatusBadge } from "@/components/leads/status-badge";
import type { Lead } from "@/types";
import { applyLeadFilters, EMPTY_FILTERS, followUpState, type LeadFilters } from "@/utils/leads";
import { formatDate, startOfDay } from "@/utils/format";
import { CHART_COLORS, toneOf, TONES } from "@/utils/tones";
import { cn } from "@/utils/cn";
import { BreakdownChart, countBy } from "./breakdown-chart";
import { AreaChart, DonutChart, type SeriesPoint, type Slice } from "./charts";
import { StatCard } from "./stat-card";

const DAY = 86_400_000;
const WEEKS = 8;
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

const toLabels = <T extends { id: string }>(items: T[], label: (i: T) => string) =>
  Object.fromEntries(items.map((i) => [i.id, label(i)]));

/** Colour follows the entity's position in its master list, never its rank, so filters don't repaint bars. */
const colorByIndex = <T extends { id: string }>(items: T[]) =>
  Object.fromEntries(items.map((item, i) => [item.id, CHART_COLORS[i % CHART_COLORS.length]]));

/** Leads created in each of the last 8 rolling weeks, oldest first, ending today. */
function weeklyIntake(leads: Lead[]): SeriesPoint[] {
  const end = startOfDay() + DAY;
  return Array.from({ length: WEEKS }, (_, i) => {
    const to = end - (WEEKS - 1 - i) * 7 * DAY;
    const from = to - 7 * DAY;
    const value = leads.filter((l) => l.createdAt >= from && l.createdAt < to).length;
    return {
      label: shortDate.format(from),
      detail: `${shortDate.format(from)} – ${shortDate.format(to - DAY)}`,
      value,
    };
  });
}

export function DashboardView() {
  const me = useCurrentUser();
  const { leads, statuses, projects, sources, departments, users } = useCrmData();
  const feed = useActivityFeed(100);
  const setCreateOpen = useUIStore((s) => s.setCreateLeadOpen);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const filtered = useMemo(() => applyLeadFilters(leads.items, filters), [leads.items, filters]);

  const metrics = useMemo(() => {
    const today = startOfDay();
    const weekAgo = today + DAY - 7 * DAY;
    let newToday = 0, lastWeek = 0, open = 0, won = 0, lost = 0, dueToday = 0, overdue = 0;
    for (const l of filtered) {
      const cat = statuses.byId[l.statusId]?.category ?? "open";
      if (l.createdAt >= today) newToday++;
      if (l.createdAt >= weekAgo) lastWeek++;
      if (cat === "won") won++;
      else if (cat === "lost") lost++;
      else open++;
      const fu = followUpState(l, statuses.byId);
      if (fu === "today") dueToday++;
      if (fu === "overdue") overdue++;
    }
    return { total: filtered.length, newToday, lastWeek, open, won, lost, dueToday, overdue };
  }, [filtered, statuses.byId]);

  const flow = useMemo(() => weeklyIntake(filtered), [filtered]);
  const flowTrend = useMemo(() => {
    const recent = flow.slice(4).reduce((s, p) => s + p.value, 0);
    const prior = flow.slice(0, 4).reduce((s, p) => s + p.value, 0);
    // Small bases give silly percentages (+800%), so show the absolute change instead.
    if (prior < 5) return { delta: recent - prior, text: `${recent - prior >= 0 ? "+" : ""}${recent - prior} leads` };
    const p = Math.round(((recent - prior) / prior) * 100);
    return { delta: p, text: `${p >= 0 ? "+" : ""}${p}%` };
  }, [flow]);

  const pipeline: Slice[] = useMemo(() => {
    const counts = countBy(filtered, (l) => l.statusId, {});
    const byId = Object.fromEntries(counts.map((c) => [c.id, c.value]));
    return [...statuses.items]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ id: s.id, label: s.name, value: byId[s.id] ?? 0, color: toneOf(s.color).fg }))
      .filter((s) => s.value > 0);
  }, [filtered, statuses.items]);

  const breakdowns = useMemo(() => {
    const sourceColors = colorByIndex(sources.items);
    const projectColors = colorByIndex(projects.items);
    const withColor = (rows: ReturnType<typeof countBy>, colors: Record<string, string>) =>
      rows.map((r) => ({ ...r, color: colors[r.id] ?? "var(--status-neutral)" }));
    return {
      source: withColor(countBy(filtered, (l) => l.sourceId, toLabels(sources.items, (s) => s.name)), sourceColors).slice(0, 6),
      project: withColor(countBy(filtered, (l) => l.projectId, toLabels(projects.items, (p) => p.name)), projectColors),
      department: countBy(filtered, (l) => l.departmentId, toLabels(departments.items, (d) => d.name)),
      user: countBy(filtered, (l) => l.assignedTo, toLabels(users.items, (u) => u.fullName)).slice(0, 8),
    };
  }, [filtered, projects.items, sources.items, departments.items, users.items]);

  const followUps = useMemo(
    () =>
      filtered
        .map((lead) => ({ lead, state: followUpState(lead, statuses.byId) }))
        .filter((x): x is { lead: Lead; state: "today" | "overdue" } => x.state !== null)
        .sort((a, b) => (a.state === b.state ? (a.lead.followUpDate ?? "").localeCompare(b.lead.followUpDate ?? "") : a.state === "overdue" ? -1 : 1)),
    [filtered, statuses.byId],
  );

  const filteredIds = useMemo(() => new Set(filtered.map((l) => l.id)), [filtered]);
  const recentActivities = useMemo(
    () => feed.activities.filter((a) => filteredIds.has(a.leadId)).slice(0, 8),
    [feed.activities, filteredIds],
  );
  const recentLeads = useMemo(() => [...filtered].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6), [filtered]);

  const loading = leads.loading || statuses.loading;
  const scope =
    me.role === "admin"
      ? "Company-wide overview"
      : me.role === "dept_head"
        ? `${departments.byId[me.departmentId ?? ""]?.name ?? "Department"} overview`
        : "Your assigned leads";
  const showTeam = me.role === "admin" || me.role === "dept_head";
  const topProject = breakdowns.project[0];
  const pct = (n: number) => (metrics.total ? Math.round((n / metrics.total) * 100) : 0);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting */}
      <div className="flex animate-rise-in flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] text-slate-500">{longDate.format(new Date())}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Welcome back, {me.fullName.split(" ")[0]}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[15px] text-slate-500">
            {scope} ·
            <span className="inline-flex items-center gap-1 font-medium text-brand-600">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> updates live
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center gap-3 rounded-full border border-border bg-card px-4 text-sm font-medium shadow-sm">
            <span className="flex items-center gap-1.5 text-slate-800">
              <Trophy className="h-4 w-4" style={{ color: TONES.green.fg }} /> Won {metrics.won}
            </span>
            <span className="h-4 w-px bg-border" />
            <span style={{ color: TONES.red.fg }}>Lost {metrics.lost}</span>
            <span className="h-4 w-px bg-border" />
            <span style={{ color: TONES.amber.fg }}>{metrics.overdue} overdue</span>
          </div>
          {hasPermission(me, "leads:create") && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Lead
            </Button>
          )}
        </div>
      </div>

      <LeadFiltersBar value={filters} onChange={setFilters} hideSearch />

      {leads.error ? (
        <Card><ErrorState message="Dashboard data could not be loaded." /></Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            <StatCard label="Total leads" value={metrics.total} icon={Users} tone="green" loading={loading} delay={0}
              hint={`${metrics.lastWeek} added in the last 7 days`} />
            <StatCard label="New today" value={metrics.newToday} icon={Sparkles} tone="blue" loading={loading} delay={60}
              hint={`${metrics.newToday} added since midnight`} />
            <StatCard label="Open leads" value={metrics.open} icon={Clock3} tone="amber" loading={loading} delay={120}
              hint={`${pct(metrics.open)}% of pipeline`} />
            <StatCard label="Follow-ups today" value={metrics.dueToday} icon={CalendarClock} tone="green" loading={loading} delay={180}
              hint={metrics.overdue ? `${metrics.overdue} overdue, act now` : "Nothing overdue"} />
          </div>

          {/* Lead flow + pipeline */}
          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="card-lift xl:col-span-3">
              <PanelHeader
                title="Lead flow"
                description={`Weekly intake, last ${WEEKS} weeks`}
                action={
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: (flowTrend.delta >= 0 ? TONES.green : TONES.red).soft, color: (flowTrend.delta >= 0 ? TONES.green : TONES.red).fg }}
                    title="Last 4 weeks compared with the 4 before"
                  >
                    {flowTrend.delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {flowTrend.text}
                  </span>
                }
              />
              <div className="px-3 pb-4 pt-4 sm:px-5">
                {loading ? <Skeleton className="mx-3 h-[300px]" /> : <AreaChart points={flow} />}
              </div>
            </Card>

            <Card className="card-lift xl:col-span-2">
              <PanelHeader title="Pipeline by status" description="Where every lead stands" />
              <div className="flex flex-col items-center gap-6 px-6 pb-6 pt-5">
                {loading ? (
                  <Skeleton className="h-[200px] w-[200px] rounded-full" />
                ) : pipeline.length === 0 ? (
                  <p className="py-16 text-sm text-slate-500">No leads for the current filters.</p>
                ) : (
                  <>
                    <DonutChart slices={pipeline} centerLabel="leads" activeId={activeStatus} onActive={setActiveStatus} />
                    <ul className="grid w-full grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                      {pipeline.map((s) => (
                        <li
                          key={s.id}
                          onPointerEnter={() => setActiveStatus(s.id)}
                          onPointerLeave={() => setActiveStatus(null)}
                          className={cn(
                            "flex items-center gap-2 rounded-md text-sm transition-opacity",
                            activeStatus && activeStatus !== s.id && "opacity-50",
                          )}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                          <button
                            type="button"
                            onClick={() => setFilters({ ...filters, statusId: filters.statusId === s.id ? "" : s.id })}
                            className="flex-1 truncate text-left text-slate-600 hover:text-slate-900"
                            title={`Filter dashboard to ${s.label}`}
                          >
                            {s.label}
                          </button>
                          <span className="font-semibold tabular-nums text-slate-900">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Sources, projects, follow-ups */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <BreakdownChart title="Top sources" description="Where leads come from" rows={breakdowns.source} total={metrics.total} loading={loading} />

            <Card className="card-lift flex flex-col">
              <PanelHeader title="Leads by project" description="Split across active projects" />
              <div className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-5">
                {loading ? (
                  <Skeleton className="h-[170px]" />
                ) : breakdowns.project.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No data for the current filters.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-6">
                      <DonutChart slices={breakdowns.project.map((p) => ({ ...p, color: p.color! }))} size={170} thickness={30} centerLabel="leads" />
                      <ul className="min-w-0 flex-1 space-y-3">
                        {breakdowns.project.slice(0, 5).map((p) => (
                          <li key={p.id} className="flex items-start gap-3">
                            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="min-w-0">
                              <span className="block truncate font-display text-[15px] font-semibold text-slate-900">{p.label}</span>
                              <span className="block text-sm text-slate-500">
                                {p.value} lead{p.value === 1 ? "" : "s"} · {pct(p.value)}%
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {topProject && breakdowns.project.length > 1 && (
                      <p className="mt-auto rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600">
                        {topProject.label} drives <span className="font-semibold text-slate-900">{pct(topProject.value)}%</span> of intake.
                        Consider allocating more site-visit slots there.
                      </p>
                    )}
                  </>
                )}
              </div>
            </Card>

            <Card className="card-lift flex flex-col">
              <PanelHeader
                title="Today’s follow-ups"
                description="Don’t let them go cold"
                action={
                  <span
                    className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold"
                    style={{ backgroundColor: TONES.amber.soft, color: TONES.amber.fg }}
                  >
                    {followUps.length}
                  </span>
                }
              />
              <div className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-5">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : followUps.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <CalendarClock className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">You’re all caught up</p>
                    <p className="text-sm text-slate-500">No follow-ups due today.</p>
                  </div>
                ) : (
                  followUps.slice(0, 3).map(({ lead, state }) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="block rounded-xl border border-border bg-slate-50 p-4 transition-colors hover:border-brand-200 hover:bg-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate font-display text-[15px] font-semibold text-slate-900">{lead.name}</p>
                        <StatusBadge status={statuses.byId[lead.statusId]} />
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {lead.remarks || lead.notes || projects.byId[lead.projectId]?.name || lead.phone}
                      </p>
                      <p
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: state === "overdue" ? TONES.red.fg : TONES.amber.fg }}
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        {state === "overdue" ? `Overdue · ${formatDate(lead.followUpDate)}` : "Due today"}
                      </p>
                    </Link>
                  ))
                )}
                <Link
                  href="/leads"
                  className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
                >
                  View all leads <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>

          {showTeam && (
            <div className="grid gap-5 md:grid-cols-2">
              <BreakdownChart title="Leads by department" description="Ownership across teams" rows={breakdowns.department} loading={loading} />
              <BreakdownChart title="Leads by user" description="Top owners by assigned leads" rows={breakdowns.user} loading={loading} />
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader title="Recent leads" action={<Link href="/leads" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>} />
              {loading ? (
                <TableSkeleton rows={5} />
              ) : recentLeads.length === 0 ? (
                <EmptyState title="No leads for these filters" />
              ) : (
                <LeadTable leads={recentLeads} compact />
              )}
            </Card>
            <Card>
              <CardHeader title="Recent activity" action={<Link href="/activities" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>} />
              <div className="px-5 py-4">
                {feed.error ? (
                  <ErrorState message="Activity could not be loaded." />
                ) : (
                  <ActivityTimeline activities={recentActivities} loading={feed.loading} showLead emptyText="No recent activity." />
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
