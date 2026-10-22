import { auth } from "@/lib/firebase/client";
import type { UserFormValues } from "@/lib/validation";

async function call(path: string, method: string, body?: unknown) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("You are signed out. Please sign in again.");
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

/** User management goes through the server because creating logins needs the Admin SDK. */
export const usersApi = {
  create: (values: UserFormValues) => call("/api/users", "POST", values),
  update: (uid: string, values: UserFormValues) =>
    call(`/api/users/${encodeURIComponent(uid)}`, "PATCH", { ...values, password: values.password || undefined }),
  remove: (uid: string) => call(`/api/users/${encodeURIComponent(uid)}`, "DELETE"),
};
