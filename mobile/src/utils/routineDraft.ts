import type { Routine, RoutineExercise } from "@/utils/routineStore";

export type RoutineExerciseDraft = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
};

export type RoutineDraft = {
  name: string;
  muscleGroups: string[];
  exercises: RoutineExerciseDraft[];
};

export function toDraft(routine: Routine | undefined): RoutineDraft {
  return {
    name: routine?.name ?? "",
    muscleGroups: routine?.muscleGroups ?? [],
    exercises:
      routine?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: String(exercise.sets),
        reps: String(exercise.reps),
        restSeconds: String(exercise.restSeconds),
      })) ?? [],
  };
}

export function toRoutine(routineId: string, draft: RoutineDraft): Routine {
  const exercises: RoutineExercise[] = draft.exercises.map(
    (exercise, index) => ({
      id: exercise.id,
      name: exercise.name.trim() || `Exercise ${index + 1}`,
      sets: Math.max(1, Number.parseInt(exercise.sets, 10) || 1),
      reps: Math.max(1, Number.parseInt(exercise.reps, 10) || 1),
      restSeconds: Math.max(0, Number.parseInt(exercise.restSeconds, 10) || 0),
    }),
  );

  return {
    id: routineId,
    name: draft.name.trim(),
    muscleGroups: draft.muscleGroups,
    exercises,
  };
}
