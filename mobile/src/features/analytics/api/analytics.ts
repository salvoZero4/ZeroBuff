import { getRoutines } from "@/features/routines/api/routines";
import { getExerciseStats } from "@/features/exercises/api/exercise";
import { apiRequest } from "@/shared/api/client";
import {
  getSessions,
  getSessionDetails,
  createSetLogApi,
  updateSetLogApi,
} from "@/features/workout/api/session";
import type { SetLogRead } from "@/features/workout/types/session";
import { parseSet, type HistoryEntry } from "../utils/progress";
import type { ExerciseSessionLog } from "@/features/exercises/types/exercise";

export async function allPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<T[]>,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await fetchPage(offset, 100);
    result.push(...page);
    if (page.length < 100) return result;
  }
}
export const getSessionHistory = () =>
  allPages((offset, limit) => getSessions({ offset, limit }));
export const getRoutineNames = () =>
  allPages((offset, limit) => getRoutines({ offset, limit }));
export async function getExerciseHistory(id: string): Promise<HistoryEntry[]> {
  const [logs, sessions] = await Promise.all([
    allPages<ExerciseSessionLog>(
      async (offset, limit) =>
        (await getExerciseStats(id, { offset, limit })).sessions,
    ),
    getSessionHistory(),
  ]);
  const byId = new Map(sessions.map((session) => [session.id, session]));
  return logs
    .filter((log) => byId.get(log.session_id)?.status === "completed")
    .map((log) => ({
      ...log,
      started_at: byId.get(log.session_id)!.started_at,
    }));
}
export type RoutineStats = {
  routine_id: string;
  exercises_stats: {
    exercise_id: string;
    name: string;
    latest_weight: number | null;
    previous_weight: number | null;
    latest_date: string | null;
    previous_date: string | null;
    percentage_improvement: number | null;
  }[];
};
export const getRoutineStats = (id: string) =>
  apiRequest<RoutineStats>(`/routines/${id}/stats`);

export async function saveSessionSet(
  sessionId: string,
  exerciseId: string,
  setId: string | undefined,
  values: Parameters<typeof parseSet>[0],
  sets: SetLogRead[],
) {
  const payload = parseSet(values);
  if (
    sets.some(
      (set) =>
        set.exercise_id === exerciseId &&
        set.set_number === payload.set_number &&
        set.id !== setId,
    )
  ) {
    throw new Error("That set number already exists for this exercise.");
  }
  return setId
    ? updateSetLogApi(sessionId, setId, payload)
    : createSetLogApi(sessionId, exerciseId, payload);
}

export type LoggedExercise = { id: string; name: string };
export async function getLoggedExercises(): Promise<LoggedExercise[]> {
  const sessions = (await getSessionHistory()).filter(
    (s) => s.status === "completed",
  );
  const exercises = new Map<string, LoggedExercise>();
  // Bound concurrent requests; only saved sets establish exercise membership.
  for (let offset = 0; offset < sessions.length; offset += 4) {
    const details = await Promise.all(
      sessions.slice(offset, offset + 4).map((s) => getSessionDetails(s.id)),
    );
    for (const session of details)
      for (const set of session.sets) {
        exercises.set(set.exercise_id, {
          id: set.exercise_id,
          name: set.exercise_name,
        });
      }
  }
  return [...exercises.values()].sort((a, b) => a.name.localeCompare(b.name));
}
