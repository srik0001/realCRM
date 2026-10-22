"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { ROLE_LABELS } from "@/types";

export function UserMenu() {
  const me = useCurrentUser();
  const { signOut } = useAuth();
  const { departments } = useCrmData();
  const router = useRouter();

  return (
    <Dropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100"
        >
          <Avatar name={me.fullName} />
          <span className="hidden text-left md:block">
            <span className="block text-sm font-medium leading-tight text-slate-900">{me.fullName}</span>
            <span className="block text-xs leading-tight text-slate-500">{ROLE_LABELS[me.role]}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{me.fullName}</p>
            <p className="truncate text-xs text-slate-500">{me.email}</p>
            <p className="mt-1 text-xs text-slate-500">
              {ROLE_LABELS[me.role]}
              {me.departmentId && departments.byId[me.departmentId] ? ` · ${departments.byId[me.departmentId].name}` : ""}
            </p>
          </div>
          <MenuItem icon={<Settings />} onClick={() => { close(); router.push("/settings"); }}>
            Settings
          </MenuItem>
          <MenuItem icon={<LogOut />} danger onClick={() => { close(); signOut(); }}>
            Log out
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}
