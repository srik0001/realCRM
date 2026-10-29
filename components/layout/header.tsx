"use client";

import { Menu } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { GlobalSearch } from "./global-search";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";

export function Header() {
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
