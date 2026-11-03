import { apiRequest } from "@/shared/api/client";
import type {
  ExerciseCreated,
  ExerciseListResponse,
  ExerciseRead,
  ExerciseStatsResponse,
  GetExercisesParams,
} from "@/features/exercises/types/exercise";

export async function getExercises(
  params: GetExercisesParams = {},
): Promise<ExerciseRead[]> {
  const query = new URLSearchParams();
  if (params.name?.trim()) query.set("name", params.name.trim());
  if (params.muscle_group) query.set("muscle_group", params.muscle_group);
  if (params.equipment) query.set("equipment", params.equipment);
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const qs = query.toString();
  const response = await apiRequest<ExerciseListResponse>(
    `/exercises/${qs ? `?${qs}` : ""}`,
  );
  return response.exercises;
}

export function createExercise(
  payload: ExerciseCreated,
): Promise<ExerciseRead> {
  return apiRequest<ExerciseRead>("/exercises/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getExerciseStats(
  exerciseId: string,
  params: { offset?: number; limit?: number } = {},
): Promise<ExerciseStatsResponse> {
  return apiRequest<ExerciseStatsResponse>(
    `/exercises/${exerciseId}/stats?offset=${params.offset ?? 0}&limit=${params.limit ?? 10}`,
  );
}
