import type { Metadata } from "next";
import { ActivitiesView } from "@/components/leads/activities-view";

export const metadata: Metadata = { title: "Lead Activities" };

export default function ActivitiesPage() {
  return <ActivitiesView />;
}
