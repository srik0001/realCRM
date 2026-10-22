import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { StatusesPage } from "@/components/masters/master-pages";

export const metadata: Metadata = { title: "Lead Statuses" };

export default function Page() {
  return (
    <RequirePermission permission="masters:manage">
      <StatusesPage />
    </RequirePermission>
  );
}
