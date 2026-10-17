import { apiRequest } from "./client";

export const MUSCLE_GROUPS = [
  "chest",
  "chest_upper",
  "lats",
  "upper_back",
  "lower_back",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "brachialis",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "adductors",
  "abductors",
  "hip_flexors",
  "abs",
  "obliques",
  "traps",
  "neck",
  "cardio",
  "full_body",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_LIST = [
  "barbell",
  "dumbbell",
  "machine",
  "smith_machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "bodyweight_weighted",
  "resistance_band",
  "other",
] as const;

export type Equipment = (typeof EQUIPMENT_LIST)[number];

export type ExerciseRead = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscle_groups?: MuscleGroup[] | null;
  equipment: Equipment;
  created_by_user?: string | null;
};

export type ExerciseListResponse = {
  exercises: ExerciseRead[];
};

export type ExerciseCreated = {
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscle_groups?: MuscleGroup[] | null;
  equipment: Equipment;
};

export type GetExercisesParams = {
  name?: string;
  muscle_group?: MuscleGroup;
  equipment?: Equipment;
  offset?: number;
  limit?: number;
};

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
