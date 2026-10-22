"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { createLead } from "@/lib/database/leads";
import { emptyLeadForm, type LeadFormValues } from "@/lib/validation";
import { useUIStore } from "@/store/ui-store";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/utils/errors";
import { formToLeadInput, LeadFormFields, useLeadForm } from "./lead-form";

export function CreateLeadDrawer() {
  const me = useCurrentUser();
  const open = useUIStore((s) => s.createLeadOpen);
  const setOpen = useUIStore((s) => s.setCreateLeadOpen);
  const form = useLeadForm();
  const { handleSubmit, reset, formState } = form;

  const close = useCallback(() => {
    setOpen(false);
    reset(emptyLeadForm);
  }, [setOpen, reset]);

  if (!hasPermission(me, "leads:create")) return null;

  const save = (another: boolean) =>
    handleSubmit(async (values: LeadFormValues) => {
      try {
        await createLead(formToLeadInput(values), me);
        toast.success("Lead created", { description: values.name });
        if (another) {
          // Keep the context fields so batches of similar leads are quick to enter.
          reset({
            ...emptyLeadForm,
            projectId: values.projectId,
            departmentId: values.departmentId,
            assignedTo: values.assignedTo,
            statusId: values.statusId,
            sourceId: values.sourceId,
            subSourceId: values.subSourceId,
          });
          document.getElementById("lead-name")?.focus();
        } else {
          close();
        }
      } catch (err) {
        toast.error("Could not create lead", { description: errorMessage(err) });
      }
    })();

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Create Lead"
      description="Fields marked * are required."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => save(true)} disabled={formState.isSubmitting}>
            Save &amp; create another
          </Button>
          <Button onClick={() => save(false)} loading={formState.isSubmitting}>
            Save lead
          </Button>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        {open && <LeadFormFields form={form} mode="create" />}
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
