"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { updateLead } from "@/lib/database/leads";
import type { Lead } from "@/types";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/utils/errors";
import { formToLeadInput, LeadFormFields, useLeadForm } from "./lead-form";

function leadToForm(lead: Lead) {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    altPhone: lead.altPhone ?? "",
    projectId: lead.projectId,
    departmentId: lead.departmentId,
    assignedTo: lead.assignedTo,
    statusId: lead.statusId,
    sourceId: lead.sourceId,
    subSourceId: lead.subSourceId ?? "",
    remarks: lead.remarks ?? "",
    followUpDate: lead.followUpDate ?? "",
    preferredLocation: lead.preferredLocation ?? "",
    budget: lead.budget ?? "",
    notes: lead.notes ?? "",
  };
}

export function EditLeadDrawer({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const me = useCurrentUser();
  const form = useLeadForm();
  const { handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (lead) reset(leadToForm(lead));
  }, [lead, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!lead) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { statusId, assignedTo, departmentId, ...rest } = formToLeadInput(values);
      await updateLead(lead, rest, me);
      toast.success("Lead updated");
      onClose();
    } catch (err) {
      toast.error("Could not update lead", { description: errorMessage(err) });
    }
  });

  return (
    <Drawer
      open={!!lead}
      onClose={onClose}
      title="Edit Lead"
      description={lead?.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={formState.isSubmitting}>Cancel</Button>
          <Button onClick={onSubmit} loading={formState.isSubmitting}>Save changes</Button>
        </div>
      }
    >
      <form noValidate onSubmit={onSubmit}>
        {lead && <LeadFormFields form={form} mode="edit" />}
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
