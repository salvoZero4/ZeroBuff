import { apiRequest } from "./client";
import type { MuscleGroup } from "./exercise";

export type ExerciseInRoutine = {
  exercise_id: string;
  sets: number;
  reps: number;
  rest_time: number;
  order_index: number;
};

export type ExerciseInRoutineRead = ExerciseInRoutine & {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
};

export type RoutineListRead = {
  id: string; // uuid
  name: string;
  exercises_count: number;
  muscle_groups: MuscleGroup[];
};

export type RoutineRead = {
  id: string; // uuid
  name: string;
  exercises: ExerciseInRoutineRead[];
};

export type RoutineCreate = {
  name: string;
  exercises: ExerciseInRoutine[];
};

export type RoutineUpdate = {
  name?: string | null;
  exercises?: ExerciseInRoutine[] | null;
};

export type GetRoutinesParams = {
  offset?: number;
  limit?: number;
};

export function getRoutines(
  params: GetRoutinesParams = {},
): Promise<RoutineListRead[]> {
  const query = new URLSearchParams();
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiRequest<RoutineListRead[]>(`/routines/${qs ? `?${qs}` : ""}`);
}

export function getRoutine(routineId: string): Promise<RoutineRead> {
  return apiRequest<RoutineRead>(`/routines/${routineId}`);
}

export function createRoutine(payload: RoutineCreate): Promise<RoutineRead> {
  return apiRequest<RoutineRead>("/routines/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRoutine(
  routineId: string,
  payload: RoutineUpdate,
): Promise<RoutineRead> {
  return apiRequest<RoutineRead>(`/routines/${routineId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRoutine(routineId: string): Promise<void> {
  return apiRequest<void>(`/routines/${routineId}`, {
    method: "DELETE",
  });
}
