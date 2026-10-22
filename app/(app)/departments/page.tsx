import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { DepartmentsPage } from "@/components/masters/master-pages";

export const metadata: Metadata = { title: "Departments" };

export default function Page() {
  return (
    <RequirePermission permission="departments:manage">
      <DepartmentsPage />
    </RequirePermission>
  );
}
