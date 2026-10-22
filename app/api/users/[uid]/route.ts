import { ServerValue } from "firebase-admin/database";
import { PATHS } from "@/lib/database/paths";
import { errorResponse, HttpError, requireAdmin } from "@/lib/auth/server";
import { userApiSchema } from "@/lib/validation";
import { toProfileRecord } from "../profile";

type Ctx = { params: Promise<{ uid: string }> };

/** Update a user's profile and keep their Firebase Auth account in sync. Admin only. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { admin, uid: actorId } = await requireAdmin(req);
    const { uid } = await params;
    const parsed = userApiSchema.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid user data.");
    const input = parsed.data;

    const existing = await admin.db.ref(`${PATHS.users}/${uid}`).get();
    if (!existing.exists()) throw new HttpError(404, "User not found.");
    if (uid === actorId && (input.role !== "admin" || input.status !== "active")) {
      throw new HttpError(400, "You can't remove your own admin access or deactivate yourself.");
    }

    await admin.auth.updateUser(uid, {
      email: input.email,
      displayName: input.fullName,
      disabled: input.status === "inactive",
      ...(input.password ? { password: input.password } : {}),
    });
    if (input.status === "inactive") await admin.auth.revokeRefreshTokens(uid);

    await admin.db.ref(`${PATHS.users}/${uid}`).update({ ...toProfileRecord(input), updatedAt: ServerValue.TIMESTAMP });
    return Response.json({ uid });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Permanently delete a user. Blocked while they still own leads. Admin only. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { admin, uid: actorId } = await requireAdmin(req);
    const { uid } = await params;
    if (uid === actorId) throw new HttpError(400, "You can't delete your own account.");

    const owned = await admin.db.ref(PATHS.leads).orderByChild("assignedTo").equalTo(uid).limitToFirst(1).get();
    if (owned.exists()) {
      throw new HttpError(409, "This user still has leads assigned. Reassign them first, or deactivate the user instead.");
    }

    await admin.auth.deleteUser(uid).catch((err: { code?: string }) => {
      if (err?.code !== "auth/user-not-found") throw err;
    });
    await admin.db.ref().update({ [`${PATHS.users}/${uid}`]: null, [`${PATHS.notifications}/${uid}`]: null });
    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
