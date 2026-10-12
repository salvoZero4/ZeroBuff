import { apiRequest } from "./client";

export type MuscleGroup =
  | "chest"
  | "chest_upper"
  | "lats"
  | "upper_back"
  | "lower_back"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "brachialis"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "adductors"
  | "abductors"
  | "hip_flexors"
  | "abs"
  | "obliques"
  | "traps"
  | "neck"
  | "cardio"
  | "full_body";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "smith_machine"
  | "cable"
  | "kettlebell"
  | "bodyweight"
  | "bodyweight_weighted"
  | "resistance_band"
  | "other";

export type ExerciseRead = {
  id: string; // uuid
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
  offset?: number;
  limit?: number;
};

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
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
  "abs",
  "obliques",
  "traps",
];

export const EQUIPMENT_LIST: readonly Equipment[] = [
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
];

export async function getExercises(
  params: GetExercisesParams = {},
): Promise<ExerciseRead[]> {
  const query = new URLSearchParams();

  if (params.name?.trim()) query.set("name", params.name.trim());
  if (params.muscle_group) query.set("muscle_group", params.muscle_group);
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const qs = query.toString();

  const response = await apiRequest<ExerciseListResponse>(
    `/v1/exercises/${qs ? `?${qs}` : ""}`,
  );
  return response.exercises;
}

export function createExercise(
  payload: ExerciseCreated,
): Promise<ExerciseRead> {
  return apiRequest<ExerciseRead>("/v1/exercises/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
