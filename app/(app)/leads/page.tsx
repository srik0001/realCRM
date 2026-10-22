import { Suspense } from "react";
import { LeadsView } from "@/components/leads/leads-view";

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsView />
    </Suspense>
  );
}
