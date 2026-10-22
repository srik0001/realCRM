"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, ChevronsLeft, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
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
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        nested && !collapsed && "pl-10",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
      <span className={cn("truncate transition-opacity duration-200", collapsed && "sr-only")}>{item.label}</span>
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
      <div className="space-y-1 border-y border-slate-100 py-1">
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
          "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
          childActive ? "text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", (open || childActive) && "rotate-180")} />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          open || childActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="space-y-1 overflow-hidden">
          {item.children!.map((c) => (
            <NavLink key={c.href} item={c} collapsed={false} nested />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { profile } = useAuth();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const items = NAV_ITEMS.filter((i) => hasPermission(profile, i.permission)).map((i) =>
    i.children ? { ...i, children: i.children.filter((c) => hasPermission(profile, c.permission)) } : i,
  );

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4", collapsed && "justify-center px-0")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Building2 className="h-[18px] w-[18px]" />
        </div>
        {!collapsed && <span className="flex-1 text-base font-semibold tracking-tight">RealCRM</span>}
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3" aria-label="Main">
        {items.map((item) =>
          item.children ? (
            item.children.length > 0 && <NavGroup key={item.label} item={item} collapsed={collapsed} />
          ) : (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ),
        )}
      </nav>
      {!onClose && (
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("h-[18px] w-[18px] transition-transform duration-300", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
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
          "sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile / tablet overlay drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")} inert={!mobileOpen}>
        <div
          className={cn("absolute inset-0 bg-slate-900/40 transition-opacity duration-300", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
