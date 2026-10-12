import { tokenStore } from "../stores/tokenStore";
import { ApiError, NetworkError } from "./errors";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;
const TIMEOUT_MS = 30_000; // generous on purpose: Render free tier cold start

let onSessionExpired: () => void = () => {};
let refreshPromise: Promise<void> | null = null;

type RequestOptions = RequestInit & { auth?: boolean };

export const setOnSessionExpired = (cb: () => void) => {
  onSessionExpired = cb;
};

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON
  }

  // FastAPI 422: detail is a list of { loc: ["body", "email"], msg: "..." }
  if (res.status === 422 && Array.isArray(body?.detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const d of body.detail) {
      fieldErrors[d.loc[d.loc.length - 1]] = d.msg;
    }
    return new ApiError(422, "Validation error", fieldErrors);
  }

  const message =
    typeof body?.detail === "string" ? body.detail : res.statusText;
  return new ApiError(res.status, message);
}

// Single-flight: concurrent 401s share ONE refresh request
function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<void> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new ApiError(401, "No refresh token");

  const res = await rawFetch("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) throw await toApiError(res);

  const data = await res.json();
  await tokenStore.setAccess(data.access_token);
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { auth = true, ...init } = opts;

  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (auth && token) headers.set("Authorization", `Bearer ${token}`);
    return rawFetch(path, { ...init, headers });
  };

  const tokenUsed = tokenStore.getAccess();
  let res = await send(tokenUsed);

  // Retry exactly once, and only for authenticated calls: a 401 on /login
  // just means "wrong password", not "expired token".
  if (res.status === 401 && auth) {
    // If another request already refreshed while ours was in flight, the token
    // in the store is newer than the one we used: just retry, no new refresh.
    if (tokenStore.getAccess() === tokenUsed) {
      try {
        await refreshSession();
      } catch (e) {
        // Only a definitive answer from the server ends the session.
        // Network errors and 5xx must NOT log the user out.
        if (e instanceof ApiError && [400, 401, 403].includes(e.status)) {
          await tokenStore.clear();
          onSessionExpired();
        }
        throw e;
      }
    }
    res = await send(tokenStore.getAccess());
  }

  if (!res.ok) throw await toApiError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
