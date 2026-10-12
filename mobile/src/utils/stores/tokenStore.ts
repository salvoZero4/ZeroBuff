import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

// In-memory copies: reads are synchronous. The disk (SecureStore) is the source
// of truth across restarts; load() copies it into memory once at startup.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  // Must be awaited once at startup, before reading any token.
  load: async () => {
    [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
  },

  getAccess: () => accessToken,
  getRefresh: () => refreshToken,

  setAccess: async (access: string) => {
    accessToken = access;
    await SecureStore.setItemAsync(ACCESS_KEY, access);
  },

  setTokens: async (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
    ]);
  },

  clear: async () => {
    accessToken = null;
    refreshToken = null;
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
