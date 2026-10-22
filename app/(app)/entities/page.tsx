import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { EntitiesPage } from "@/components/masters/master-pages";

export const metadata: Metadata = { title: "Entities" };

export default function Page() {
  return (
    <RequirePermission permission="entities:manage">
      <EntitiesPage />
    </RequirePermission>
  );
}
