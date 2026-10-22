"use client";

import { useCallback, useState } from "react";
import type { Lead } from "@/types";
import { EditLeadDrawer } from "./edit-lead-drawer";
import {
  AddActivityDialog,
  AssignLeadDialog,
  ChangeStatusDialog,
  DeleteLeadDialog,
  type LeadAction,
} from "./lead-action-dialogs";

/** Owns which lead action dialog is open so lists and detail pages share one implementation. */
export function useLeadActions(onDeleted?: () => void) {
  const [state, setState] = useState<{ action: LeadAction; lead: Lead } | null>(null);
  const open = useCallback((action: LeadAction, lead: Lead) => setState({ action, lead }), []);
  const close = useCallback(() => setState(null), []);
  const pick = (a: LeadAction) => (state?.action === a ? state.lead : null);

  const dialogs = (
    <>
      <EditLeadDrawer lead={pick("edit")} onClose={close} />
      <AssignLeadDialog lead={pick("assign")} onClose={close} />
      <ChangeStatusDialog lead={pick("status")} onClose={close} />
      <AddActivityDialog lead={pick("activity")} onClose={close} />
      <DeleteLeadDialog lead={pick("delete")} onClose={close} onDeleted={onDeleted} />
    </>
  );
  return { open, dialogs };
}
