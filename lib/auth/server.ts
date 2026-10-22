import "server-only";
import { getAdmin } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/database/paths";
import type { UserProfile } from "@/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Verifies the Firebase ID token in the Authorization header and loads the caller's
 * profile from the database. Throws HttpError unless the caller is an active Admin.
 */
export async function requireAdmin(req: Request) {
  const admin = getAdmin();
  if (!admin) {
    throw new HttpError(503, "Server is missing Firebase Admin credentials. See .env.example.");
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Missing authentication token.");

  let uid: string;
  try {
    uid = (await admin.auth.verifyIdToken(token, true)).uid;
  } catch {
    throw new HttpError(401, "Invalid or expired session. Please sign in again.");
  }

  const snap = await admin.db.ref(`${PATHS.users}/${uid}`).get();
  const profile = snap.val() as UserProfile | null;
  if (!profile || profile.status !== "active" || profile.role !== "admin") {
    throw new HttpError(403, "Only administrators can manage users.");
  }
  return { admin, uid };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
  const code = (err as { code?: string })?.code;
  if (code === "auth/email-already-exists") {
    return Response.json({ error: "A user with this email already exists." }, { status: 409 });
  }
  if (code === "auth/invalid-password") {
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  console.error(err);
  return Response.json({ error: "Unexpected server error." }, { status: 500 });
}
