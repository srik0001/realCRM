import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/types";

export function StatusBadge({ status }: { status?: LeadStatus }) {
  if (!status) return <Badge>Unknown</Badge>;
  return <Badge tone={status.color}>{status.name}</Badge>;
}
