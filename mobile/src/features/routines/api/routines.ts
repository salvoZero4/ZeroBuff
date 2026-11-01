import { apiRequest } from "@/shared/api/client";
import type {
  GetRoutinesParams,
  RoutineCreate,
  RoutineListRead,
  RoutineRead,
  RoutineUpdate,
} from "@/features/routines/types/routine";

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
