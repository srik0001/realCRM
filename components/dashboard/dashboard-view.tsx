"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarClock,
  CircleDot,
  Plus,
  Sparkles,
  ThumbsDown,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useActivityFeed } from "@/hooks/use-activities";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { LeadFiltersBar } from "@/components/leads/lead-filters";
import { LeadTable } from "@/components/leads/lead-table";
import { applyLeadFilters, EMPTY_FILTERS, followUpState, type LeadFilters } from "@/utils/leads";
import { startOfDay } from "@/utils/format";
import { BreakdownChart, countBy } from "./breakdown-chart";
import { StatCard } from "./stat-card";

const toLabels = <T extends { id: string }>(items: T[], label: (i: T) => string) =>
  Object.fromEntries(items.map((i) => [i.id, label(i)]));

export function DashboardView() {
  const me = useCurrentUser();
  const { leads, statuses, projects, sources, departments, users } = useCrmData();
  const feed = useActivityFeed(100);
  const setCreateOpen = useUIStore((s) => s.setCreateLeadOpen);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);

  const filtered = useMemo(() => applyLeadFilters(leads.items, filters), [leads.items, filters]);

  const metrics = useMemo(() => {
    const today = startOfDay();
    let newToday = 0, mine = 0, open = 0, won = 0, lost = 0, dueToday = 0, overdue = 0;
    for (const l of filtered) {
      const cat = statuses.byId[l.statusId]?.category ?? "open";
      if (l.createdAt >= today) newToday++;
      if (l.assignedTo === me.id) mine++;
      if (cat === "won") won++;
      else if (cat === "lost") lost++;
      else open++;
      const fu = followUpState(l, statuses.byId);
      if (fu === "today") dueToday++;
      if (fu === "overdue") overdue++;
    }
    return { total: filtered.length, newToday, mine, open, won, lost, dueToday, overdue };
  }, [filtered, statuses.byId, me.id]);

  const breakdowns = useMemo(
    () => ({
      project: countBy(filtered, (l) => l.projectId, toLabels(projects.items, (p) => p.name)),
      source: countBy(filtered, (l) => l.sourceId, toLabels(sources.items, (s) => s.name)),
      status: countBy(filtered, (l) => l.statusId, toLabels(statuses.items, (s) => s.name)),
      department: countBy(filtered, (l) => l.departmentId, toLabels(departments.items, (d) => d.name)),
      user: countBy(filtered, (l) => l.assignedTo, toLabels(users.items, (u) => u.fullName)).slice(0, 8),
    }),
    [filtered, projects.items, sources.items, statuses.items, departments.items, users.items],
  );

  const filteredIds = useMemo(() => new Set(filtered.map((l) => l.id)), [filtered]);
  const recentActivities = useMemo(
    () => feed.activities.filter((a) => filteredIds.has(a.leadId)).slice(0, 8),
    [feed.activities, filteredIds],
  );
  const recentLeads = filtered.slice(0, 8);

  const loading = leads.loading || statuses.loading;
  const scope =
    me.role === "admin"
      ? "Company-wide overview"
      : me.role === "dept_head"
        ? `${departments.byId[me.departmentId ?? ""]?.name ?? "Department"} overview`
        : "Your assigned leads";
  const showTeam = me.role === "admin" || me.role === "dept_head";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${me.fullName.split(" ")[0]}`}
        description={`${scope} · updates live`}
        actions={
          hasPermission(me, "leads:create") ? (
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Lead</Button>
          ) : undefined
        }
      />

      <div className="mb-6">
        <LeadFiltersBar value={filters} onChange={setFilters} hideSearch />
      </div>

      {leads.error ? (
        <Card><ErrorState message="Dashboard data could not be loaded." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Total leads" value={metrics.total} icon={Users} loading={loading} />
            <StatCard label="New today" value={metrics.newToday} icon={Sparkles} accent="violet" loading={loading} />
            <StatCard label="Assigned to me" value={metrics.mine} icon={UserCheck} accent="slate" loading={loading} />
            <StatCard label="Open leads" value={metrics.open} icon={CircleDot} accent="blue" loading={loading} />
            <StatCard label="Won" value={metrics.won} icon={Trophy} accent="green" loading={loading}
              hint={metrics.total ? `${Math.round((metrics.won / metrics.total) * 100)}% conversion` : undefined} />
            <StatCard label="Lost" value={metrics.lost} icon={ThumbsDown} accent="red" loading={loading} />
            <StatCard label="Follow-ups today" value={metrics.dueToday} icon={CalendarClock} accent="amber" loading={loading} />
            <StatCard label="Overdue follow-ups" value={metrics.overdue} icon={AlarmClock} accent="red" loading={loading} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <BreakdownChart title="Leads by status" rows={breakdowns.status} loading={loading} />
            <BreakdownChart title="Leads by source" rows={breakdowns.source} loading={loading} />
            <BreakdownChart title="Leads by project" rows={breakdowns.project} loading={loading} />
            {showTeam && <BreakdownChart title="Leads by department" rows={breakdowns.department} loading={loading} />}
            {showTeam && <BreakdownChart title="Leads by user" rows={breakdowns.user} loading={loading} />}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader title="Recent leads" action={<Link href="/leads" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>} />
              {loading ? (
                <TableSkeleton rows={5} />
              ) : recentLeads.length === 0 ? (
                <EmptyState title="No leads for these filters" />
              ) : (
                <LeadTable leads={recentLeads} compact />
              )}
            </Card>
            <Card>
              <CardHeader title="Recent activity" action={<Link href="/activities" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>} />
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
