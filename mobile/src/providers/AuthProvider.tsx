import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

  useEffect(() => {
    setOnSessionExpired(() => {
      queryClient.clear(); // don't leave this user's data visible to the next one
      setStatus("signedOut");
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
    await authApi.logout();
    queryClient.clear();
    setStatus("signedOut");
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
