import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession, AuthStatus, SignUpDraft } from "@/types/auth";
import { isTokenExpired } from "@/utils/jwt";
import * as authService from "@/features/auth/auth-service";

interface AuthStore {
  status: AuthStatus;
  session: AuthSession | null;
  pendingSignup: SignUpDraft | null;
  boot: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthSession>;
  getValidAccessToken: () => Promise<string | null>;
  getValidIdToken: () => Promise<string | null>; // ← NEW: returns the ID token for API Gateway
  setPendingSignup: (draft: SignUpDraft) => void;
  clearPendingSignup: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      status: "checking",
      session: null,
      pendingSignup: null,

      async boot() {
        const currentSession = get().session;

        if (!currentSession) {
          set({ status: "anonymous" });
          return;
        }

        if (!isTokenExpired(currentSession.accessToken)) {
          set({ status: "authenticated" });
          return;
        }

        try {
          const refreshed = await authService.refreshSession(currentSession);
          set({ session: refreshed, status: "authenticated" });
        } catch {
          set({ session: null, status: "anonymous" });
        }
      },

      async signIn(email, password) {
        const session = await authService.signIn(email, password);
        set({ session, status: "authenticated" });
        return session;
      },

      async signOut() {
        const session = get().session;
        await authService.signOut(session);
        set({ session: null, pendingSignup: null, status: "anonymous" });
      },

      async refreshSession() {
        const currentSession = get().session;
        if (!currentSession) {
          throw new Error("No active session.");
        }

        const refreshed = await authService.refreshSession(currentSession);
        set({ session: refreshed, status: "authenticated" });
        return refreshed;
      },

      // Returns the access token (kept for any non-API-Gateway use)
      async getValidAccessToken() {
        const currentSession = get().session;
        if (!currentSession) return null;

        if (!isTokenExpired(currentSession.accessToken)) {
          return currentSession.accessToken;
        }

        const refreshed = await get().refreshSession();
        return refreshed.accessToken;
      },

      // ── NEW ──────────────────────────────────────────────────────────────
      // API Gateway Cognito authorizers validate the ID token, not the
      // access token. Always use this for Authorization headers.
      async getValidIdToken() {
        const currentSession = get().session;
        if (!currentSession) return null;

        // Re-use the access token expiry as a proxy — both tokens share the
        // same expiry window from Cognito.
        if (!isTokenExpired(currentSession.accessToken)) {
          return currentSession.idToken;
        }

        const refreshed = await get().refreshSession();
        return refreshed.idToken;
      },
      // ─────────────────────────────────────────────────────────────────────

      setPendingSignup(draft) {
        set({ pendingSignup: draft });
      },

      clearPendingSignup() {
        set({ pendingSignup: null });
      },

      clearSession() {
        set({ session: null, status: "anonymous" });
      },
    }),
    {
      name: "fittrack-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        session: state.session,
        pendingSignup: state.pendingSignup,
      }),
    },
  ),
);