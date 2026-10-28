"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bell, CalendarClock } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useNotifications } from "@/hooks/use-notifications";
import { Dropdown } from "@/components/ui/dropdown";
import { followUpState } from "@/utils/leads";
import { formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

export function NotificationsMenu() {
  const me = useCurrentUser();
  const { leads, statuses } = useCrmData();
  const { items, unread, markRead, markAllRead } = useNotifications(me.id);

  // Follow-up reminders are derived live from the user's own assigned leads.
  const dueFollowUps = useMemo(
    () =>
      leads.items
        .filter((l) => l.assignedTo === me.id)
        .map((l) => ({ lead: l, state: followUpState(l, statuses.byId) }))
        .filter((x) => x.state !== null),
    [leads.items, statuses.byId, me.id],
  );
  const count = unread + dueFollowUps.length;

  return (
    <Dropdown
      className="w-80 max-w-[calc(100vw-2rem)]"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-slate-600 shadow-sm hover:bg-slate-100 hover:text-slate-900"
          aria-label={`Notifications${count ? ` (${count} new)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--status-lost)] ring-2 ring-background px-1 text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {dueFollowUps.map(({ lead, state }) => (
              <Link
                key={`fu-${lead.id}`}
                href={`/leads/${lead.id}`}
                onClick={close}
                className="flex gap-3 px-4 py-2.5 hover:bg-slate-50"
              >
                <CalendarClock className={cn("mt-0.5 h-4 w-4 shrink-0", state === "overdue" ? "text-red-500" : "text-amber-500")} />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-slate-900">
                    {state === "overdue" ? "Overdue follow-up" : "Follow-up due today"}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{lead.name}</span>
                </span>
              </Link>
            ))}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.leadId ? `/leads/${n.leadId}` : "#"}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  close();
                }}
                className={cn("flex gap-3 px-4 py-2.5 hover:bg-slate-50", !n.read && "bg-brand-50/50")}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-slate-900">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-slate-500">{n.body}</span>}
                  <span className="block text-[11px] text-slate-400">{formatRelative(n.createdAt)}</span>
                </span>
              </Link>
            ))}
            {items.length === 0 && dueFollowUps.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
