"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { equalTo, onValue, orderByChild, query, ref, type Query } from "firebase/database";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/database/paths";
import { subscribeList } from "@/lib/database/crud";
import { useCurrentUser } from "@/lib/auth/auth-context";
import type {
  AppSettings,
  Department,
  Entity,
  Lead,
  LeadStatus,
  Project,
  Source,
  SubSource,
  UserProfile,
} from "@/types";

type Collection<T> = { items: T[]; byId: Record<string, T>; loading: boolean; error: string | null };

type CrmData = {
  entities: Collection<Entity>;
  projects: Collection<Project>;
  departments: Collection<Department>;
  users: Collection<UserProfile>;
  statuses: Collection<LeadStatus>;
  sources: Collection<Source>;
  subSources: Collection<SubSource>;
  /** Leads visible to the current user (all, department, or assigned), kept live. */
  leads: Collection<Lead>;
  settings: AppSettings;
};

const CrmDataContext = createContext<CrmData | null>(null);

function emptyCollection<T>(): Collection<T> {
  return { items: [], byId: {}, loading: true, error: null };
}

function useLiveCollection<T extends { id: string }>(
  q: Query | null,
  sort?: (a: T, b: T) => number,
): Collection<T> {
  const [state, setState] = useState<Collection<T>>(emptyCollection);
  useEffect(() => {
    if (!q) return;
    return subscribeList<T>(
      q,
      (items) => {
        const sorted = sort ? [...items].sort(sort) : items;
        setState({
          items: sorted,
          byId: Object.fromEntries(sorted.map((i) => [i.id, i])),
          loading: false,
          error: null,
        });
      },
      (err) => setState({ items: [], byId: {}, loading: false, error: err.message }),
    );
    // The query is memoised by the caller; `sort` is a stable module-level function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return state;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const byFullName = (a: UserProfile, b: UserProfile) => a.fullName.localeCompare(b.fullName);
const byOrder = (a: LeadStatus, b: LeadStatus) => (a.order ?? 0) - (b.order ?? 0);
const byNewest = (a: Lead, b: Lead) => (b.createdAt ?? 0) - (a.createdAt ?? 0);

export function CrmDataProvider({ children }: { children: ReactNode }) {
  const me = useCurrentUser();

  const queries = useMemo(
    () => ({
      entities: ref(db, PATHS.entities),
      projects: ref(db, PATHS.projects),
      departments: ref(db, PATHS.departments),
      users: ref(db, PATHS.users),
      statuses: ref(db, PATHS.leadStatuses),
      sources: ref(db, PATHS.sources),
      subSources: ref(db, PATHS.subSources),
    }),
    [],
  );

  // Security rules only allow these exact query shapes for non-admins.
  const leadsQuery = useMemo<Query | null>(() => {
    const leadsRef = ref(db, PATHS.leads);
    if (me.role === "admin") return leadsRef;
    if (me.role === "dept_head" && me.departmentId) {
      return query(leadsRef, orderByChild("departmentId"), equalTo(me.departmentId));
    }
    return query(leadsRef, orderByChild("assignedTo"), equalTo(me.id));
  }, [me.role, me.departmentId, me.id]);

  const entities = useLiveCollection<Entity>(queries.entities, byName);
  const projects = useLiveCollection<Project>(queries.projects, byName);
  const departments = useLiveCollection<Department>(queries.departments, byName);
  const users = useLiveCollection<UserProfile>(queries.users, byFullName);
  const statuses = useLiveCollection<LeadStatus>(queries.statuses, byOrder);
  const sources = useLiveCollection<Source>(queries.sources, byName);
  const subSources = useLiveCollection<SubSource>(queries.subSources, byName);
  const leads = useLiveCollection<Lead>(leadsQuery, byNewest);

  const [settings, setSettings] = useState<AppSettings>({});
  useEffect(() => onValue(ref(db, PATHS.settings), (snap) => setSettings(snap.val() ?? {}), () => {}), []);

  const value = useMemo<CrmData>(
    () => ({ entities, projects, departments, users, statuses, sources, subSources, leads, settings }),
    [entities, projects, departments, users, statuses, sources, subSources, leads, settings],
  );

  return <CrmDataContext.Provider value={value}>{children}</CrmDataContext.Provider>;
}

export function useCrmData(): CrmData {
  const ctx = useContext(CrmDataContext);
  if (!ctx) throw new Error("useCrmData must be used inside <CrmDataProvider>");
  return ctx;
}
