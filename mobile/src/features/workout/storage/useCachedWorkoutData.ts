import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { getRoutine } from "@/features/routines/api/routines";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { offlineWorkoutStorage } from "./offlineWorkoutStorage";
import { cacheRoutine, refreshWorkoutCache } from "./workoutCache";

export const offlineStartEnabled =
  Boolean(offlineWorkoutStorage) && process.env.EXPO_PUBLIC_OFFLINE_START !== "false";

export const savedScheduleKey = (account?: string | null) =>
  account === undefined ? ["savedWorkoutSchedule"] as const : ["savedWorkoutSchedule", account] as const;

export const savedRoutineKey = (account: string | null, id: string | undefined) =>
  ["savedWorkoutRoutine", account, id] as const;

export function getWorkoutRoutine(id: string) {
  return refreshWorkoutCache(id, () => getRoutine(id), cacheRoutine);
}

export function useCachedWorkoutSchedule() {
  const { accountId } = useAuth();
  return useQuery({
    queryKey: savedScheduleKey(accountId),
    queryFn: () => offlineWorkoutStorage!.readSchedule(accountId!),
    enabled: Boolean(accountId && offlineWorkoutStorage),
    networkMode: "always",
  });
}

export function useWorkoutRoutine(id: string | undefined, enabled: boolean) {
  const { accountId } = useAuth();
  const local = useQuery({
    queryKey: savedRoutineKey(accountId, id),
    queryFn: () => offlineWorkoutStorage!.readRoutine(accountId!, id!),
    enabled: Boolean(enabled && accountId && id && offlineWorkoutStorage),
    networkMode: "always",
  });
  const remote = useQuery({
    queryKey: routineKeys.detail(id),
    queryFn: () => getWorkoutRoutine(id!),
    enabled: enabled && Boolean(id),
  });
  return {
    ...remote,
    cachedRoutine: local.data,
    loadingLocal: Boolean(enabled && accountId && id && offlineWorkoutStorage && local.isPending),
    data: remote.data ?? local.data ?? undefined,
  };
}
