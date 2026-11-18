import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { tokenStore } from "@/features/auth/store/tokenStore";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { ApiError, NetworkError } from "@/shared/api/errors";
import { queryClient } from "@/shared/api/queryClient";
import { sessionKeys } from "../api/queryKeys";
import { uploadCompletedWorkout } from "../api/session";
import { offlineWorkoutStorage } from "../storage/offlineWorkoutStorage";

export function useQueuedWorkouts() {
  const { accountId } = useAuth();
  return useQuery({
    queryKey: sessionKeys.queue(accountId),
    queryFn: () => offlineWorkoutStorage!.list(accountId!),
    enabled: Boolean(accountId && offlineWorkoutStorage),
    networkMode: "always",
  });
}

export function WorkoutSyncProvider() {
  const { accountId, status } = useAuth();
  const { data } = useQueuedWorkouts();
  const wake = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!accountId || status !== "signedIn" || !offlineWorkoutStorage) return;
    const storage = offlineWorkoutStorage;
    const scope = tokenStore.getSessionScope();
    let disposed = false;
    let online = false;
    let running = false;
    let rescan = false;
    let failures = 0;
    let authBlocked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ownsSession = () =>
      !disposed && tokenStore.getSessionScope() === scope && tokenStore.getAccountId() === accountId;

    function retry() {
      const delay = Math.min(120_000, 5_000 * 2 ** Math.min(failures++, 5));
      timer = setTimeout(() => {
        timer = undefined;
        void drain();
      }, delay);
    }

    async function drain() {
      if (timer || authBlocked || !ownsSession() || !online || AppState.currentState !== "active") return;
      if (running) {
        rescan = true;
        return;
      }
      running = true;
      const key = sessionKeys.queue(accountId);
      try {
        for (const workout of await storage.list(accountId!)) {
          if (!ownsSession() || !online || AppState.currentState !== "active") return;
          if (workout.error) continue;
          try {
            const response = await uploadCompletedWorkout(workout.payload);
            if (response.id !== workout.payload.id) throw new NetworkError();
          } catch (error) {
            if (!ownsSession()) return;
            if (error instanceof ApiError && error.status === 401) {
              authBlocked = true;
              return;
            }
            if (!(error instanceof ApiError) || error.status === 429 || error.status >= 500) {
              retry();
              return;
            }
            await storage.block(accountId!, workout.payload.id, error.message || "Workout needs attention.");
            void queryClient.invalidateQueries({ queryKey: key });
            continue;
          }
          if (!ownsSession()) return;
          await storage.remove(accountId!, workout.payload.id);
          failures = 0;
          if (!ownsSession()) return;
          void queryClient.invalidateQueries({ queryKey: key });
          void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
          for (const exerciseId of new Set(workout.payload.sets.map((set) => set.exercise_id))) {
            void queryClient.invalidateQueries({ queryKey: exerciseKeys.stats(exerciseId) });
          }
        }
      } catch {
        if (ownsSession()) retry();
      } finally {
        running = false;
        if (rescan) {
          rescan = false;
          void drain();
        }
      }
    }

    wake.current = () => void drain();
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      online = Boolean(state.isConnected) && state.isInternetReachable !== false;
      if (online) void drain();
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void drain();
    });
    return () => {
      disposed = true;
      wake.current = null;
      clearTimeout(timer);
      unsubscribeNetwork();
      subscription.remove();
    };
  }, [accountId, status]);
  useEffect(() => {
    if (data?.some((item) => !item.error)) wake.current?.();
  }, [data]);

  return null;
}
