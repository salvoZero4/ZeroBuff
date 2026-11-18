import { clearExercisePicker } from "@/features/exercises/store/exercisePickerStore";
import {
  detachActiveWorkout,
  restoreActiveWorkout,
  flushWorkoutPersistence,
} from "@/features/workout/store/activeWorkoutStore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { router } from "expo-router";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { getCurrentUser } from "@/features/profile/api/user";
import { tokenStore } from "../store/tokenStore";
import * as authApi from "@/features/auth/api/auth";
import { setOnSessionExpired } from "@/shared/api/client";
import { onlineManager } from "@tanstack/react-query";
import { queryClient } from "@/shared/api/queryClient";

type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  accountId: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accountId, setAccountId] = useState<string | null>(null);
  const isSigningOut = useRef(false);

  useEffect(() => {
    setOnSessionExpired(() => {
      if (isSigningOut.current) return;
      clearExercisePicker();
      detachActiveWorkout();
      setAccountId(null);
      queryClient.clear(); // don't leave this user's data visible to the next one
      setStatus((current) => (current === "signedOut" ? current : "signedOut"));
    });

    let cancelled = false;
    authApi
      .restoreSession()
      .then(async (hasSession) => {
        if (hasSession) {
          // A disk failure must not sign the user out; Workout exposes Retry.
          await restoreActiveWorkout().catch(() => {});
        } else detachActiveWorkout();
        if (!cancelled) {
          setAccountId(tokenStore.getAccountId());
          setStatus(tokenStore.getRefresh() ? "signedIn" : "signedOut");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("signedOut");
      });

    return () => {
      cancelled = true;
      setOnSessionExpired(() => {});
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    clearExercisePicker();
    detachActiveWorkout();
    await authApi.login(username, password); // throws on failure: status stays signedOut
    await restoreActiveWorkout().catch(() => {});
    setAccountId(tokenStore.getAccountId());
    setStatus("signedIn");
  }, []);

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      clearExercisePicker();
      detachActiveWorkout();
      await authApi.register(username, email, password); // register also returns tokens
      await restoreActiveWorkout().catch(() => {});
      setAccountId(tokenStore.getAccountId());
      setStatus("signedIn");
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (isSigningOut.current) return;
    isSigningOut.current = true;
    try {
      clearExercisePicker();
      detachActiveWorkout();
      await flushWorkoutPersistence();
      await authApi.logout();
      setAccountId(null);
      queryClient.clear();
      setStatus((current) => (current === "signedOut" ? current : "signedOut"));
      router.replace("/(auth)/sign-in");
    } finally {
      isSigningOut.current = false;
    }
  }, []);

  // Existing installations did not persist the ID returned by login.
  useEffect(() => {
    if (status !== "signedIn" || accountId) return;
    const scope = tokenStore.getSessionScope();
    if (!scope) return;
    let cancelled = false;
    async function resolveAccount() {
      const user = await getCurrentUser();
      if (cancelled || tokenStore.getSessionScope() !== scope) return;
      await tokenStore.setAccountId(user.id);
      if (cancelled || tokenStore.getSessionScope() !== scope) return;
      await restoreActiveWorkout().catch(() => {});
      if (!cancelled && tokenStore.getSessionScope() === scope) {
        setAccountId(user.id);
        void queryClient.invalidateQueries({ queryKey: routineKeys.all });
        void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      }
    }
    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) void resolveAccount().catch(() => {});
    });
    if (onlineManager.isOnline()) void resolveAccount().catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [status, accountId]);

  // Stable identity: without useMemo/useCallback every render of the provider
  // would create a new object and re-render every component that uses useAuth().
  const value = useMemo(
    () => ({ status, accountId, signIn, signUp, signOut }),
    [status, accountId, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
