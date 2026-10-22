import { ServerValue } from "firebase-admin/database";
import { PATHS } from "@/lib/database/paths";
import { errorResponse, HttpError, requireAdmin } from "@/lib/auth/server";
import { userApiSchema } from "@/lib/validation";
import { toProfileRecord } from "./profile";

/** Create a Firebase Auth account plus its CRM profile. Admin only. */
export async function POST(req: Request) {
  try {
    const { admin, uid: actorId } = await requireAdmin(req);
    const parsed = userApiSchema.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid user data.");
    const input = parsed.data;
    if (!input.password) throw new HttpError(400, "A password is required for new users.");

    const user = await admin.auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.fullName,
      disabled: input.status === "inactive",
    });

    try {
      await admin.db.ref(`${PATHS.users}/${user.uid}`).set({
        ...toProfileRecord(input),
        createdBy: actorId,
        createdAt: ServerValue.TIMESTAMP,
        updatedAt: ServerValue.TIMESTAMP,
      });
    } catch (err) {
      // Don't leave an orphaned login behind if the profile write fails.
      await admin.auth.deleteUser(user.uid).catch(() => {});
      throw err;
    }

    return Response.json({ uid: user.uid }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
