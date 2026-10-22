"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Loading" />
    </div>
  );
}

/** Redirects to /login when signed out and blocks inactive or profile-less accounts. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading, profileError, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, firebaseUser, router, pathname]);

  if (loading || !firebaseUser) return <FullPageSpinner />;

  if (!profile || profile.status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold">Account unavailable</h1>
          <p className="mt-1 text-sm text-slate-500">
            {profileError ?? "Your account has been deactivated. Contact an administrator."}
          </p>
          <Button className="mt-5" variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AccessDenied() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Access denied</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      <Button className="mt-5" variant="outline" onClick={() => router.replace("/dashboard")}>
        Go to dashboard
      </Button>
    </div>
  );
}

/** Renders children only when the current user holds `permission`. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { profile } = useAuth();
  if (!hasPermission(profile, permission)) return <AccessDenied />;
  return <>{children}</>;
}
