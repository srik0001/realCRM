import type { Metadata } from "next";
import { RequirePermission } from "@/lib/auth/guards";
import { ProjectsPage } from "@/components/masters/master-pages";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <RequirePermission permission="projects:manage">
      <ProjectsPage />
    </RequirePermission>
  );
}
