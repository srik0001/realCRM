"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ref, update } from "firebase/database";
import { toast } from "sonner";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/database/paths";
import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { useCrmData } from "@/lib/database/crm-data-context";
import { ROLE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { phoneSchema } from "@/lib/validation";
import { errorMessage } from "@/utils/errors";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  phone: z.union([z.literal(""), phoneSchema]),
});

export function SettingsView() {
  const me = useCurrentUser();
  const { resetPassword } = useAuth();
  const { departments, projects, settings } = useCrmData();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: me.fullName, phone: me.phone ?? "" },
  });

  useEffect(() => reset({ fullName: me.fullName, phone: me.phone ?? "" }), [me.fullName, me.phone, reset]);

  const saveProfile = handleSubmit(async (v) => {
    try {
      // Rules let users edit only their own name and phone.
      await update(ref(db, `${PATHS.users}/${me.id}`), { fullName: v.fullName, phone: v.phone || null });
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Could not update profile", { description: errorMessage(err) });
    }
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Your profile and workspace preferences." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Profile" />
          <form onSubmit={saveProfile} noValidate className="space-y-4 px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="s-name" required error={errors.fullName?.message}>
                <Input id="s-name" invalid={!!errors.fullName} {...register("fullName")} />
              </Field>
              <Field label="Phone" htmlFor="s-phone" error={errors.phone?.message}>
                <Input id="s-phone" type="tel" invalid={!!errors.phone} {...register("phone")} />
              </Field>
              <Field label="Email" htmlFor="s-email" hint="Ask an administrator to change your email.">
                <Input id="s-email" value={me.email} disabled readOnly />
              </Field>
              <Field label="Role" htmlFor="s-role">
                <Input id="s-role" value={`${ROLE_LABELS[me.role]}${me.departmentId ? ` · ${departments.byId[me.departmentId]?.name ?? ""}` : ""}`} disabled readOnly />
              </Field>
            </div>
            {me.role !== "admin" && (
              <p className="text-sm text-slate-500">
                Projects: {Object.keys(me.projectIds ?? {}).map((p) => projects.byId[p]?.name).filter(Boolean).join(", ") || "None"}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await resetPassword(me.email);
                    toast.success("Password reset email sent", { description: me.email });
                  } catch (err) {
                    toast.error("Could not send reset email", { description: errorMessage(err) });
                  }
                }}
              >
                Send password reset email
              </Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save profile</Button>
            </div>
          </form>
        </Card>

        {hasPermission(me, "settings:manageApp") && <WorkspaceSettings key={`${settings.companyName}|${settings.defaultCanCreateLeads}`} initial={settings} />}
      </div>
    </div>
  );
}

function WorkspaceSettings({ initial }: { initial: { companyName?: string; defaultCanCreateLeads?: boolean } }) {
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [defaultCanCreate, setDefaultCanCreate] = useState(initial.defaultCanCreateLeads ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await update(ref(db, PATHS.settings), { companyName: companyName.trim() || null, defaultCanCreateLeads: defaultCanCreate });
      toast.success("Workspace settings saved");
    } catch (err) {
      toast.error("Could not save settings", { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Workspace" description="Admin only" />
      <div className="space-y-4 px-5 py-5">
        <Field label="Company name" htmlFor="w-company">
          <Input id="w-company" value={companyName} maxLength={120} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">New Pre-Sales/Sales users can create leads</p>
            <p className="text-xs text-slate-500">Default for the toggle when adding users. You can still change it per user.</p>
          </div>
          <Switch checked={defaultCanCreate} onChange={setDefaultCanCreate} label="Default lead creation permission" />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Save workspace settings</Button>
        </div>
      </div>
    </Card>
  );
}
