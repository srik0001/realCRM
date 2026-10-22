import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { SubSourcesPage } from "@/components/masters/master-pages";

export const metadata: Metadata = { title: "Sub-Sources" };

export default function Page() {
  return (
    <RequirePermission permission="masters:manage">
      <SubSourcesPage />
    </RequirePermission>
  );
}
