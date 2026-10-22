import { LeadDetailView } from "@/components/leads/lead-detail-view";

export default async function LeadDetailPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  return <LeadDetailView leadId={id} />;
}
