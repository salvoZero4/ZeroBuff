import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { getRoutineNames, getSessionHistory } from "../api/analytics";
export function useHistory() {
  return useQuery({
    queryKey: sessionKeys.history(),
    queryFn: getSessionHistory,
  });
}
export function useRoutineNames() {
  return useQuery({
    queryKey: routineKeys.names(),
    queryFn: getRoutineNames,
  });
}
export function useRefreshTraining() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [
        sessionKeys.all,
        routineKeys.all,
        exerciseKeys.allStats(),
        scheduleKeys.all,
      ].map((queryKey) => client.invalidateQueries({ queryKey })),
    );
}
