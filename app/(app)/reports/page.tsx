import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <RequirePermission permission="reports:view">
      <ReportsView />
    </RequirePermission>
  );
}
