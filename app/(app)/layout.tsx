import { Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { RequireAuth } from "@/lib/auth/guards";
import { CrmDataProvider } from "@/lib/database/crm-data-context";
import { AppShell } from "@/components/layout/app-shell";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Loading" />
    </div>
  );
}

/** Everything under (app) needs a signed-in, active user; data is client-side and live. */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Spinner />}>
      <RequireAuth>
        <CrmDataProvider>
          <AppShell>{children}</AppShell>
        </CrmDataProvider>
      </RequireAuth>
    </Suspense>
  );
}
