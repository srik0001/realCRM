import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { UsersView } from "@/components/users/users-view";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <RequirePermission permission="users:manage">
      <UsersView />
    </RequirePermission>
  );
}
