export const MUSCLE_GROUPS = [
  "chest", "chest_upper", "lats", "upper_back", "lower_back", "front_delts",
  "side_delts", "rear_delts", "biceps", "triceps", "forearms", "brachialis",
  "quads", "hamstrings", "glutes", "calves", "adductors", "abductors",
  "hip_flexors", "abs", "obliques", "traps", "neck", "cardio", "full_body",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_LIST = [
  "barbell", "dumbbell", "machine", "smith_machine", "cable", "kettlebell",
  "bodyweight", "bodyweight_weighted", "resistance_band", "other",
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

export type ExerciseListResponse = { exercises: ExerciseRead[] };

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

export type ExerciseSessionLog = {
  session_id: string;
  date: string;
  sets: { set_number: number; reps: number; weight: number; rir: number | null }[];
};

export type ExerciseStatsResponse = {
  exercise_id: string;
  sessions: ExerciseSessionLog[];
};
