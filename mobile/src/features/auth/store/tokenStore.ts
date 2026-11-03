import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const SCOPE_KEY = "auth_session_scope";
// Opaque local namespace, not a credential. Changes on every explicit login.
const newScope = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
let sessionScope: string | null = null;

// In-memory copies: reads are synchronous. The disk (SecureStore) is the source
// of truth across restarts; load() copies it into memory once at startup.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  // Must be awaited once at startup, before reading any token.
  load: async () => {
    [accessToken, refreshToken, sessionScope] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(SCOPE_KEY),
    ]);
    // Existing logins predate the local workout namespace; migrate without a request.
    if (refreshToken && !sessionScope) {
      sessionScope = newScope();
      await SecureStore.setItemAsync(SCOPE_KEY, sessionScope);
    }
    if (!refreshToken) sessionScope = null;
  },

  getSessionScope: () => sessionScope,
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,

  setAccess: async (access: string) => {
    accessToken = access;
    await SecureStore.setItemAsync(ACCESS_KEY, access);
  },

  setTokens: async (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
    sessionScope = newScope();
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
      SecureStore.setItemAsync(SCOPE_KEY, sessionScope),
    ]);
  },

  clear: async () => {
    accessToken = null;
    refreshToken = null;
    sessionScope = null;
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(SCOPE_KEY),
    ]);
  },
};
