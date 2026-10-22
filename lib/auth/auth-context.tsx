"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { auth, db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/database/paths";
import type { UserProfile } from "@/types";

type AuthState = {
  firebaseUser: User | null;
  /** The signed-in user's CRM profile, kept live from /users/{uid}. */
  profile: UserProfile | null;
  /** True until both the auth state and (if signed in) the profile have loaded. */
  loading: boolean;
  /** Set when a signed-in account has no CRM profile or the profile can't be read. */
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: () => Promise<string>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        setProfileLoading(Boolean(user));
        if (!user) setProfile(null);
        setAuthLoading(false);
      }),
    [],
  );

  useEffect(() => {
    if (!firebaseUser) return;
    return onValue(
      ref(db, `${PATHS.users}/${firebaseUser.uid}`),
      (snap) => {
        if (snap.exists()) {
          setProfile({ ...(snap.val() as Omit<UserProfile, "id">), id: firebaseUser.uid });
          setProfileError(null);
        } else {
          setProfile(null);
          setProfileError("Your account has no CRM profile. Ask an administrator to set one up.");
        }
        setProfileLoading(false);
      },
      () => {
        setProfile(null);
        setProfileError("Your CRM profile could not be loaded.");
        setProfileLoading(false);
      },
    );
  }, [firebaseUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) throw new Error("Not signed in");
    return auth.currentUser.getIdToken();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      profile,
      loading: authLoading || profileLoading,
      profileError,
      signIn,
      signOut,
      resetPassword,
      getIdToken,
    }),
    [firebaseUser, profile, authLoading, profileLoading, profileError, signIn, signOut, resetPassword, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The signed-in, active user's profile. Only use below <RequireAuth>. */
export function useCurrentUser(): UserProfile {
  const { profile } = useAuth();
  if (!profile) throw new Error("useCurrentUser used outside an authenticated route");
  return profile;
}
