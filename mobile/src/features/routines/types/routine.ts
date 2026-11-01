import type { MuscleGroup } from "@/features/exercises/types/exercise";

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
  id: string;
  name: string;
  exercises_count: number;
  muscle_groups: MuscleGroup[];
};

export type RoutineRead = {
  id: string;
  name: string;
  exercises: ExerciseInRoutineRead[];
};

export type RoutineCreate = { name: string; exercises: ExerciseInRoutine[] };
export type RoutineUpdate = { name?: string | null; exercises?: ExerciseInRoutine[] | null };
export type GetRoutinesParams = { offset?: number; limit?: number };
