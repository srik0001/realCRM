"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarClock, ChevronDown, ChevronsLeft, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { useCrmData } from "@/lib/database/crm-data-context";
import { followUpState } from "@/utils/leads";
import { useUIStore } from "@/store/ui-store";
import { NAV_ITEMS, type NavItem } from "./nav-config";

function isActivePath(pathname: string, href?: string) {
  return !!href && (pathname === href || pathname.startsWith(`${href}/`));
}

function NavLink({ item, collapsed, nested }: { item: NavItem; collapsed: boolean; nested?: boolean }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href!}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium transition-colors",
        active
          ? "bg-sidebar-active text-white shadow-[0_8px_20px_-10px_oklch(0.55_0.1_168/0.9)]"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
        nested && !collapsed && "h-9 pl-11 text-sm",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-sidebar-muted group-hover:text-sidebar-foreground")} />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );
}

function NavGroup({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const childActive = item.children!.some((c) => isActivePath(pathname, c.href));
  const [open, setOpen] = useState(childActive);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <div className="space-y-1 border-y border-sidebar-border py-1">
        {item.children!.map((c) => (
          <NavLink key={c.href} item={c} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open || childActive}
        className={cn(
          "flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium transition-colors",
          childActive ? "text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", (open || childActive) && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200", open || childActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="space-y-1 overflow-hidden">
          {item.children!.map((c) => (
            <NavLink key={c.href} item={c} collapsed={false} nested />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavList({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  return (
    <>
      {items.map((item) =>
        item.children ? (
          item.children.length > 0 && <NavGroup key={item.label} item={item} collapsed={collapsed} />
        ) : (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ),
      )}
    </>
  );
}

function FollowUpNudge() {
  const { leads, statuses } = useCrmData();
  const { dueToday, overdue } = useMemo(() => {
    let dueToday = 0, overdue = 0;
    for (const l of leads.items) {
      const fu = followUpState(l, statuses.byId);
      if (fu === "today") dueToday++;
      else if (fu === "overdue") overdue++;
    }
    return { dueToday, overdue };
  }, [leads.items, statuses.byId]);

  return (
    <Link
      href="/leads"
      className="block rounded-2xl border border-sidebar-border bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
        <CalendarClock className="h-4 w-4 text-sidebar-muted" />
        {dueToday} follow-up{dueToday === 1 ? "" : "s"} today
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-sidebar-muted">
        {overdue > 0
          ? `${overdue} overdue. Clear those first, then keep the pipeline moving.`
          : "Keep your pipeline moving: reach out before end of day."}
      </p>
    </Link>
  );
}

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { profile } = useAuth();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const items = NAV_ITEMS.filter((i) => hasPermission(profile, i.permission)).map((i) =>
    i.children ? { ...i, children: i.children.filter((c) => hasPermission(profile, c.permission)) } : i,
  );
  const top = items.filter((i) => !i.bottom);
  const bottom = items.filter((i) => i.bottom);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-[88px] shrink-0 items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/90 text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.15)]">
          <Building2 className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-tight tracking-tight">RealCRM</p>
            <p className="text-xs text-sidebar-muted">Sales workspace</p>
          </div>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-hover" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 pb-3" aria-label="Main">
        <div className="space-y-1">
          <NavList items={top} collapsed={collapsed} />
        </div>
        <div className="mt-auto space-y-1 pt-6">
          <NavList items={bottom} collapsed={collapsed} />
        </div>
      </nav>
      <div className="space-y-2 px-3 pb-4">
        {!collapsed && <FollowUpNudge />}
        {!onClose && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-xl px-3.5 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("h-[18px] w-[18px] transition-transform duration-300", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 bg-sidebar transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile / tablet overlay drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")} inert={!mobileOpen}>
        <div
          className={cn("absolute inset-0 bg-slate-950/50 transition-opacity duration-300", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
