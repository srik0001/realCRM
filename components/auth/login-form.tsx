"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/utils/errors";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Values = z.infer<typeof schema>;

/** Only allow same-origin relative redirects after login. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginForm() {
  const { signIn, resetPassword, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (!loading && firebaseUser) router.replace(next);
  }, [loading, firebaseUser, router, next]);

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onForgot = async () => {
    const email = getValues("email");
    if (!email) return setError("Enter your email above, then click “Forgot password”.");
    try {
      await resetPassword(email);
      toast.success("If that account exists, a reset link has been sent.");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sign in to RealCRM</h1>
        <p className="mt-1 text-sm text-slate-500">Real estate lead management</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
        <button type="button" onClick={onForgot} className="w-full text-center text-sm text-brand-600 hover:underline">
          Forgot password?
        </button>
      </form>
    </div>
  );
}
