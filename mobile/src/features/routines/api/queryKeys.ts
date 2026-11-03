import type { GetRoutinesParams } from "../types/routine";

export const routineKeys = {
  all: ["routines"] as const,
  lists: () => [...routineKeys.all, "list"] as const,
  list: (params: GetRoutinesParams = {}) =>
    [...routineKeys.lists(), params] as const,
  details: () => [...routineKeys.all, "detail"] as const,
  detail: (id: string | undefined) => [...routineKeys.details(), id] as const,
};
