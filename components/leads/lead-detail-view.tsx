"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Pencil, Phone, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { canAssignLead, hasPermission } from "@/lib/auth/permissions";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useLeadActivities } from "@/hooks/use-activities";
import { ROLE_LABELS } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";
import { followUpState } from "@/utils/leads";
import { ActivityTimeline } from "./activity-timeline";
import { AddActivityForm } from "./lead-action-dialogs";
import { useLeadActions } from "./lead-actions-host";
import { StatusBadge } from "./status-badge";

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words text-slate-900">{children || "—"}</dd>
    </div>
  );
}

export function LeadDetailView({ leadId }: { leadId: string }) {
  const me = useCurrentUser();
  const router = useRouter();
  const { leads, projects, entities, statuses, sources, subSources, users, departments } = useCrmData();
  const lead = leads.byId[leadId];
  const { activities, loading: activitiesLoading, error: activitiesError } = useLeadActivities(lead ? leadId : undefined);
  const { open, dialogs } = useLeadActions(() => router.push("/leads"));

  const statusHistory = useMemo(
    () => activities.filter((a) => a.newStatusId && (a.type === "lead_created" || a.oldStatusId !== a.newStatusId)),
    [activities],
  );

  if (leads.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <Card>
        <EmptyState
          title="Lead not found"
          description="It may have been deleted, reassigned, or you don't have access to it."
          action={<Button variant="outline" onClick={() => router.push("/leads")}>Back to leads</Button>}
        />
      </Card>
    );
  }

  const project = projects.byId[lead.projectId];
  const assignee = users.byId[lead.assignedTo];
  const fu = followUpState(lead, statuses.byId);

  return (
    <div>
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Leads
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <StatusBadge status={statuses.byId[lead.statusId]} />
            {fu && <Badge tone={fu === "overdue" ? "red" : "amber"}>{fu === "overdue" ? "Follow-up overdue" : "Follow-up today"}</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-600"><Phone className="h-4 w-4" />{lead.phone}</a>
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-600"><Mail className="h-4 w-4" />{lead.email}</a>
            <span className="text-slate-400">Created {formatDateTime(lead.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => open("edit", lead)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="outline" onClick={() => open("status", lead)}><RefreshCw className="h-4 w-4" /> Change status</Button>
          {canAssignLead(me, lead) && (
            <Button variant="outline" onClick={() => open("assign", lead)}><UserCheck className="h-4 w-4" /> {lead.assignedTo ? "Reassign" : "Assign"}</Button>
          )}
          {hasPermission(me, "leads:delete") && (
            <Button variant="danger" onClick={() => open("delete", lead)}><Trash2 className="h-4 w-4" /> Delete</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Lead information" />
            <dl className="divide-y divide-slate-100 px-5 py-2">
              <InfoRow label="Phone">{lead.phone}</InfoRow>
              <InfoRow label="Alternate phone">{lead.altPhone}</InfoRow>
              <InfoRow label="Email">{lead.email}</InfoRow>
              <InfoRow label="Preferred location">{lead.preferredLocation}</InfoRow>
              <InfoRow label="Budget">{lead.budget}</InfoRow>
              <InfoRow label="Follow-up">{lead.followUpDate ? formatDate(lead.followUpDate) : ""}</InfoRow>
              <InfoRow label="Requirement">{lead.notes && <span className="whitespace-pre-line">{lead.notes}</span>}</InfoRow>
              <InfoRow label="Remarks">{lead.remarks && <span className="whitespace-pre-line">{lead.remarks}</span>}</InfoRow>
              <InfoRow label="Last activity">{formatRelative(lead.lastActivityAt)}</InfoRow>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Project & source" />
            <dl className="divide-y divide-slate-100 px-5 py-2">
              <InfoRow label="Project">{project?.name}</InfoRow>
              <InfoRow label="Location">{project?.location}</InfoRow>
              <InfoRow label="Entity">{project ? entities.byId[project.entityId]?.name : ""}</InfoRow>
              <InfoRow label="Department">{departments.byId[lead.departmentId]?.name}</InfoRow>
              <InfoRow label="Source">{sources.byId[lead.sourceId]?.name}</InfoRow>
              <InfoRow label="Sub-source">{lead.subSourceId ? subSources.byId[lead.subSourceId]?.name : ""}</InfoRow>
              <InfoRow label="Created by">{users.byId[lead.createdBy]?.fullName}</InfoRow>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Assigned to" />
            <div className="flex items-center gap-3 px-5 py-4">
              {assignee ? (
                <>
                  <Avatar name={assignee.fullName} className="h-10 w-10" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-slate-900">{assignee.fullName}</p>
                    <p className="truncate text-slate-500">{ROLE_LABELS[assignee.role]} · {departments.byId[assignee.departmentId ?? ""]?.name ?? "—"}</p>
                    <p className="truncate text-slate-500">{assignee.email}{assignee.phone ? ` · ${assignee.phone}` : ""}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Unassigned</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Status history" />
            <ol className="space-y-3 px-5 py-4">
              {statusHistory.length === 0 && <li className="text-sm text-slate-500">No status changes yet.</li>}
              {statusHistory.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <StatusBadge status={statuses.byId[a.newStatusId!]} />
                  <span className="text-right text-xs text-slate-500">
                    {users.byId[a.createdBy]?.fullName ?? "—"} · {formatDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Add activity" description="Log a call, message, meeting or site visit." />
            <div className="px-5 py-4">
              <AddActivityForm lead={lead} compact />
            </div>
          </Card>
          <Card>
            <CardHeader title="Activity timeline" description="Newest first · updates live" />
            <div className="px-5 py-5">
              {activitiesError ? (
                <ErrorState message="The activity timeline could not be loaded." />
              ) : (
                <ActivityTimeline activities={activities} loading={activitiesLoading} />
              )}
            </div>
          </Card>
        </div>
      </div>
      {dialogs}
    </div>
  );
}
