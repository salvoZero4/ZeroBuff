import type { GetExercisesParams } from "../types/exercise";

// The current page offset belongs to pageParam, not the infinite query identity.
export const exerciseKeys = {
  all: ["exercises"] as const,
  infiniteLists: () => [...exerciseKeys.all, "infinite"] as const,
  infiniteList: (params: Omit<GetExercisesParams, "offset"> = {}) =>
    [...exerciseKeys.infiniteLists(), params] as const,
  history: (id: string) => [...exerciseKeys.stats(id), "history"] as const,
  allStats: () => [...exerciseKeys.all, "stats"] as const,
  stats: (id: string | undefined) => [...exerciseKeys.allStats(), id] as const,
};
