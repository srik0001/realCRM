export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (code.includes("PERMISSION_DENIED") || code.includes("permission-denied")) {
      return "You don't have permission to do that.";
    }
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Invalid email or password.";
    }
    if (code === "auth/too-many-requests") return "Too many attempts. Please try again later.";
    if (code === "auth/user-disabled") return "This account has been deactivated.";
    if (code === "auth/network-request-failed") return "Network error. Check your connection.";
  }
  if (err instanceof Error) {
    if (/permission[_ ]denied/i.test(err.message)) return "You don't have permission to do that.";
    return err.message;
  }
  return "Something went wrong.";
}
