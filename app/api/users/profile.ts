import type { z } from "zod";
import type { userApiSchema } from "@/lib/validation";

type Input = z.infer<typeof userApiSchema>;

/** Map validated API input onto the stored /users/{uid} shape. */
export function toProfileRecord(input: Input) {
  const projectIds = Object.fromEntries(input.projectIds.map((id) => [id, true]));
  return {
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone || null,
    role: input.role,
    departmentId: input.departmentId || null,
    projectIds: Object.keys(projectIds).length ? projectIds : null,
    status: input.status,
    canCreateLeads: input.role === "presales" || input.role === "sales" ? input.canCreateLeads : null,
  };
}
