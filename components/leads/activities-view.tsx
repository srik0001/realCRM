"use client";

import { useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useActivityFeed } from "@/hooks/use-activities";
import { ACTIVITY_TYPES, type ActivityType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { ActivityTimeline } from "./activity-timeline";
import { ACTIVITY_META } from "./activity-meta";

const STEP = 30;

export function ActivitiesView() {
  const me = useCurrentUser();
  const { users, leads } = useCrmData();
  const { activities, loading, error } = useActivityFeed(1000);
  const [type, setType] = useState<ActivityType | "">("");
  const [userId, setUserId] = useState("");
  const [leadTerm, setLeadTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [visible, setVisible] = useState(STEP);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : 0;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    const term = leadTerm.trim().toLowerCase();
    return activities.filter(
      (a) =>
        (!type || a.type === type) &&
        (!userId || a.createdBy === userId) &&
        a.createdAt >= fromTs &&
        a.createdAt <= toTs &&
        (!term || (leads.byId[a.leadId]?.name ?? "").toLowerCase().includes(term)),
    );
  }, [activities, type, userId, from, to, leadTerm, leads.byId]);

  const people = users.items.filter((u) => me.role === "admin" || u.departmentId === me.departmentId || u.id === me.id);

  return (
    <div>
      <PageHeader title="Lead Activities" description="Every call, message, visit and status change across your leads · updates live" />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Lead</span>
          <Input type="search" value={leadTerm} onChange={(e) => setLeadTerm(e.target.value)} placeholder="Lead name" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Activity type</span>
          <Select value={type} onChange={(e) => setType(e.target.value as ActivityType | "")}>
            <option value="">All types</option>
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_META[t].label}</option>)}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Logged by</span>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Anyone</option>
            {people.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">From</span>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">To</span>
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
      </Card>
      <Card className="p-5">
        {error ? (
          <ErrorState message="Activities could not be loaded." />
        ) : (
          <>
            <ActivityTimeline activities={filtered.slice(0, visible)} loading={loading} showLead emptyText="No activities match these filters." />
            {filtered.length > visible && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + STEP)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
