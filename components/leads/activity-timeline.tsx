"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCrmData } from "@/lib/database/crm-data-context";
import type { LeadActivity } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";
import { ACTIVITY_META } from "./activity-meta";

export function ActivityTimeline({
  activities,
  loading,
  showLead,
  emptyText = "No activity yet.",
}: {
  activities: LeadActivity[];
  loading?: boolean;
  /** Show which lead each activity belongs to (for cross-lead feeds). */
  showLead?: boolean;
  emptyText?: string;
}) {
  const { users, statuses, leads } = useCrmData();

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) return <EmptyState title={emptyText} className="py-8" />;

  return (
    <ol className="relative space-y-5">
      {activities.map((a, idx) => {
        const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.other;
        const Icon = meta.icon;
        const lead = showLead ? leads.byId[a.leadId] : undefined;
        return (
          <li key={a.id} className="relative flex gap-3">
            {idx < activities.length - 1 && (
              <span className="absolute left-4 top-9 -bottom-5 w-px bg-slate-200" aria-hidden />
            )}
            <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200")}>
              <Icon className="h-4 w-4 text-slate-500" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                {showLead && (
                  lead ? (
                    <Link href={`/leads/${a.leadId}`} className="text-sm font-medium text-slate-900 hover:text-brand-600">{lead.name}</Link>
                  ) : (
                    <span className="text-sm text-slate-400">Lead unavailable</span>
                  )
                )}
              </div>
              {(a.oldStatusId || a.newStatusId) && a.type !== "lead_created" && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                  <span>{statuses.byId[a.oldStatusId ?? ""]?.name ?? "—"}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-900">{statuses.byId[a.newStatusId ?? ""]?.name ?? "—"}</span>
                </p>
              )}
              {(a.oldAssignedTo || a.newAssignedTo) && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                  {a.oldAssignedTo && (
                    <>
                      <span>{users.byId[a.oldAssignedTo]?.fullName ?? "Former user"}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </>
                  )}
                  <span className="font-medium text-slate-900">{users.byId[a.newAssignedTo ?? ""]?.fullName ?? "—"}</span>
                </p>
              )}
              {a.description && <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{a.description}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {users.byId[a.createdBy]?.fullName ?? "Unknown user"} ·{" "}
                <time dateTime={new Date(a.createdAt).toISOString()} title={formatDateTime(a.createdAt)}>
                  {formatRelative(a.createdAt)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
