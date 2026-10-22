"use client";

import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, PlusCircle, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { canAssignLead, hasPermission } from "@/lib/auth/permissions";
import type { Lead } from "@/types";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import type { LeadAction } from "./lead-action-dialogs";

export function LeadRowActions({ lead, onAction }: { lead: Lead; onAction: (a: LeadAction, l: Lead) => void }) {
  const me = useCurrentUser();
  const router = useRouter();
  return (
    <Dropdown
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label={`Actions for ${lead.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {(close) => {
        const run = (a: LeadAction) => () => {
          close();
          onAction(a, lead);
        };
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <MenuItem icon={<Eye />} onClick={() => { close(); router.push(`/leads/${lead.id}`); }}>View details</MenuItem>
            <MenuItem icon={<Pencil />} onClick={run("edit")}>Edit lead</MenuItem>
            {canAssignLead(me, lead) && (
              <MenuItem icon={<UserCheck />} onClick={run("assign")}>{lead.assignedTo ? "Reassign" : "Assign"}</MenuItem>
            )}
            <MenuItem icon={<PlusCircle />} onClick={run("activity")}>Add activity</MenuItem>
            <MenuItem icon={<RefreshCw />} onClick={run("status")}>Change status</MenuItem>
            {hasPermission(me, "leads:delete") && (
              <MenuItem icon={<Trash2 />} danger onClick={run("delete")}>Delete lead</MenuItem>
            )}
          </div>
        );
      }}
    </Dropdown>
  );
}
