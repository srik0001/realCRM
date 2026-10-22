import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

/**
 * Server-side Firebase Admin SDK. Used only by API routes that must bypass client
 * rules (creating Firebase Auth accounts). Returns null when credentials are missing
 * so callers can respond with a clear configuration error.
 */
function initAdmin(): App | null {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const usingEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

  if (usingEmulator) return initializeApp({ projectId, databaseURL });
  if (!projectId || !clientEmail || !privateKey || !databaseURL) return null;
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

export function getAdmin() {
  const app = initAdmin();
  if (!app) return null;
  return { auth: getAuth(app), db: getDatabase(app) };
}
