import type { GetSessionsParams } from "../types/session";

export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (params: GetSessionsParams = {}) =>
    [...sessionKeys.lists(), params] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (id: string | undefined) => [...sessionKeys.details(), id] as const,
};
