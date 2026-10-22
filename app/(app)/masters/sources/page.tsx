import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { SourcesPage } from "@/components/masters/master-pages";

export const metadata: Metadata = { title: "Sources" };

export default function Page() {
  return (
    <RequirePermission permission="masters:manage">
      <SourcesPage />
    </RequirePermission>
  );
}
