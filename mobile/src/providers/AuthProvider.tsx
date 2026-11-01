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
import * as authApi from "@/utils/api/auth";
import { setOnSessionExpired } from "@/utils/api/client";
import { queryClient } from "@/utils/api/queryClient";

type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const isSigningOut = useRef(false);

  useEffect(() => {
    setOnSessionExpired(() => {
      if (isSigningOut.current) return;
      queryClient.clear(); // don't leave this user's data visible to the next one
      setStatus((current) => (current === "signedOut" ? current : "signedOut"));
    });

    let cancelled = false;
    authApi
      .restoreSession()
      .then((hasSession) => {
        if (!cancelled) setStatus(hasSession ? "signedIn" : "signedOut");
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
    await authApi.login(username, password); // throws on failure: status stays signedOut
    setStatus("signedIn");
  }, []);

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      await authApi.register(username, email, password); // register also returns tokens
      setStatus("signedIn");
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (isSigningOut.current) return;
    isSigningOut.current = true;
    try {
      await authApi.logout();
      queryClient.clear();
      setStatus((current) => (current === "signedOut" ? current : "signedOut"));
      router.replace("/(auth)/sign-in");
    } finally {
      isSigningOut.current = false;
    }
  }, []);

  // Stable identity: without useMemo/useCallback every render of the provider
  // would create a new object and re-render every component that uses useAuth().
  const value = useMemo(
    () => ({ status, signIn, signUp, signOut }),
    [status, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
