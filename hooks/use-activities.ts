"use client";

import { useEffect, useMemo, useState } from "react";
import { equalTo, limitToLast, orderByChild, query, ref } from "firebase/database";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/database/paths";
import { subscribeList } from "@/lib/database/crud";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import type { LeadActivity } from "@/types";

type ActivitiesState = { activities: LeadActivity[]; loading: boolean; error: string | null };

// Ties (same server timestamp in one multi-path write) fall back to push-key order.
const newestFirst = (a: LeadActivity, b: LeadActivity) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.id.localeCompare(a.id);

/** Live activity timeline for one lead, newest first. */
export function useLeadActivities(leadId: string | undefined): ActivitiesState {
  const [state, setState] = useState<ActivitiesState>({ activities: [], loading: true, error: null });
  useEffect(() => {
    if (!leadId) return;
    const q = query(ref(db, PATHS.activities), orderByChild("leadId"), equalTo(leadId));
    return subscribeList<LeadActivity>(
      q,
      (items) => setState({ activities: items.sort(newestFirst), loading: false, error: null }),
      (err) => setState({ activities: [], loading: false, error: err.message }),
    );
  }, [leadId]);
  return state;
}

/**
 * Live activity feed across every lead the current user can see.
 * Admins read the global feed, department heads their department's feed, and
 * everyone else subscribes per assigned lead (the only shape the rules allow them).
 */
export function useActivityFeed(limit = 200): ActivitiesState {
  const me = useCurrentUser();
  const { leads } = useCrmData();
  const scope = me.role === "admin" ? "all" : me.role === "dept_head" && me.departmentId ? "department" : "leads";
  const leadIdsKey = scope === "leads" ? leads.items.map((l) => l.id).sort().join(",") : "";

  const [byKey, setByKey] = useState<Record<string, LeadActivity[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activitiesRef = ref(db, PATHS.activities);
    const onError = (err: Error) => setError(err.message);

    if (scope === "all" || scope === "department") {
      const q =
        scope === "all"
          ? query(activitiesRef, orderByChild("createdAt"), limitToLast(limit))
          : query(activitiesRef, orderByChild("departmentId"), equalTo(me.departmentId!));
      return subscribeList<LeadActivity>(q, (items) => setByKey({ feed: items }), onError);
    }

    const ids = leadIdsKey ? leadIdsKey.split(",") : [];
    const unsubs = ids.map((leadId) =>
      subscribeList<LeadActivity>(
        query(activitiesRef, orderByChild("leadId"), equalTo(leadId)),
        (items) => setByKey((prev) => ({ ...prev, [leadId]: items })),
        onError,
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [scope, me.departmentId, leadIdsKey, limit]);

  const keys = useMemo(() => (scope === "leads" ? (leadIdsKey ? leadIdsKey.split(",") : []) : ["feed"]), [scope, leadIdsKey]);
  // Only keys for currently visible leads count; stale entries for unassigned leads are ignored.
  const activities = useMemo(
    () => keys.flatMap((k) => byKey[k] ?? []).sort(newestFirst).slice(0, limit),
    [byKey, keys, limit],
  );
  const loading = !error && (scope === "leads" ? leads.loading || keys.some((k) => !(k in byKey)) : !("feed" in byKey));
  return { activities, loading, error };
}
