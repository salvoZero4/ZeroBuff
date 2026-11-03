import type { ListWeightsParams } from "../types/weight";

export const weightKeys = {
  all: ["bodyWeight"] as const,
  lists: () => [...weightKeys.all, "list"] as const,
  list: (params: ListWeightsParams = {}) =>
    [...weightKeys.lists(), params] as const,
  today: (day?: string) => [...weightKeys.all, "today", day ?? "default"] as const,
};
