"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useCrmData } from "@/lib/database/crm-data-context";
import type { Lead } from "@/types";
import { formatDate, formatRelative } from "@/utils/format";
import { followUpState, type LeadSortKey, type SortDir } from "@/utils/leads";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { LeadRowActions } from "./lead-row-actions";
import type { LeadAction } from "./lead-action-dialogs";

type Props = {
  leads: Lead[];
  sortKey?: LeadSortKey;
  sortDir?: SortDir;
  onSort?: (key: LeadSortKey) => void;
  onAction?: (action: LeadAction, lead: Lead) => void;
  compact?: boolean;
};

function SortHeader({ label, k, sortKey, sortDir, onSort }: { label: string; k: LeadSortKey } & Pick<Props, "sortKey" | "sortDir" | "onSort">) {
  if (!onSort) return <>{label}</>;
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-slate-900">
      {label}
      <Icon className={active ? "h-3.5 w-3.5 text-brand-600" : "h-3.5 w-3.5 text-slate-300"} />
    </button>
  );
}

export function LeadTable({ leads, sortKey, sortDir, onSort, onAction, compact }: Props) {
  const { projects, statuses, sources, subSources, users, departments } = useCrmData();
  const router = useRouter();
  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
  const td = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80">
            <tr>
              <th className={th}><SortHeader label="Lead" k="name" {...{ sortKey, sortDir, onSort }} /></th>
              <th className={th}>Phone</th>
              {!compact && <th className={th}>Email</th>}
              <th className={th}>Project</th>
              <th className={th}><SortHeader label="Status" k="status" {...{ sortKey, sortDir, onSort }} /></th>
              <th className={th}>Source</th>
              {!compact && <th className={th}>Sub-source</th>}
              <th className={th}>Assigned</th>
              {!compact && <th className={th}>Department</th>}
              <th className={th}><SortHeader label="Created" k="createdAt" {...{ sortKey, sortDir, onSort }} /></th>
              {!compact && <th className={th}><SortHeader label="Last activity" k="lastActivityAt" {...{ sortKey, sortDir, onSort }} /></th>}
              {onAction && <th className={th}><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {leads.map((lead) => {
              const fu = followUpState(lead, statuses.byId);
              return (
                <tr
                  key={lead.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className={td}>
                    <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-900 hover:text-brand-600">
                      {lead.name}
                    </Link>
                    {fu && (
                      <Badge tone={fu === "overdue" ? "red" : "amber"} className="ml-2">
                        {fu === "overdue" ? "Overdue" : "Due today"}
                      </Badge>
                    )}
                  </td>
                  <td className={td}>{lead.phone}</td>
                  {!compact && <td className={td}>{lead.email}</td>}
                  <td className={td}>{projects.byId[lead.projectId]?.name ?? "—"}</td>
                  <td className={td}><StatusBadge status={statuses.byId[lead.statusId]} /></td>
                  <td className={td}>{sources.byId[lead.sourceId]?.name ?? "—"}</td>
                  {!compact && <td className={td}>{lead.subSourceId ? subSources.byId[lead.subSourceId]?.name ?? "—" : "—"}</td>}
                  <td className={td}>{users.byId[lead.assignedTo]?.fullName ?? "Unassigned"}</td>
                  {!compact && <td className={td}>{departments.byId[lead.departmentId]?.name ?? "—"}</td>}
                  <td className={td}>{formatDate(lead.createdAt)}</td>
                  {!compact && <td className={td} title={formatDate(lead.lastActivityAt)}>{formatRelative(lead.lastActivityAt)}</td>}
                  {onAction && (
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <LeadRowActions lead={lead} onAction={onAction} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-start gap-3 px-4 py-3">
            <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-slate-900">{lead.name}</p>
                <StatusBadge status={statuses.byId[lead.statusId]} />
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">{lead.phone} · {lead.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                {projects.byId[lead.projectId]?.name} · {sources.byId[lead.sourceId]?.name} · {users.byId[lead.assignedTo]?.fullName ?? "Unassigned"}
              </p>
            </Link>
            {onAction && <LeadRowActions lead={lead} onAction={onAction} />}
          </li>
        ))}
      </ul>
    </>
  );
}
