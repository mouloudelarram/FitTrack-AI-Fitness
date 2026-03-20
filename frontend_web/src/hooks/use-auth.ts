import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const pendingSignup = useAuthStore((state) => state.pendingSignup);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const setPendingSignup = useAuthStore((state) => state.setPendingSignup);
  const clearPendingSignup = useAuthStore((state) => state.clearPendingSignup);

  return {
    status,
    session,
    pendingSignup,
    signIn,
    signOut,
    setPendingSignup,
    clearPendingSignup,
    isAuthenticated: status === "authenticated",
    isChecking: status === "checking",
  };
}
