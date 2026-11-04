import type {
  ExerciseInRoutine,
  RoutineCreate,
  RoutineRead,
} from "@/features/routines/types/routine";

export type RoutineExerciseDraft = {
  id: string;
  exercise_id: string;
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
};

export type RoutineDraft = {
  name: string;
  exercises: RoutineExerciseDraft[];
};

export function toDraft(routine: RoutineRead | undefined): RoutineDraft {
  if (!routine) {
    return {
      name: "",
      exercises: [],
    };
  }

  const sortedExercises = [...routine.exercises].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return {
    name: routine.name,
    exercises: sortedExercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      sets: String(exercise.sets),
      reps: String(exercise.reps),
      restSeconds: String(exercise.rest_time),
    })),
  };
}

export function toRoutinePayload(draft: RoutineDraft): RoutineCreate {
  const exercises: ExerciseInRoutine[] = draft.exercises.map(
    (exercise, index) => ({
      exercise_id: exercise.exercise_id,
      sets: Math.max(1, Number.parseInt(exercise.sets, 10) || 1),
      reps: Math.max(1, Number.parseInt(exercise.reps, 10) || 1),
      rest_time: Math.max(0, Number.parseInt(exercise.restSeconds, 10) || 0),
      order_index: index,
    }),
  );

  return {
    name: draft.name.trim(),
    exercises,
  };
}

// Compare editable values and exercise order without depending on transient row IDs.
export function routineDraftSignature(draft: RoutineDraft): string {
  return JSON.stringify({
    name: draft.name,
    exercises: draft.exercises.map(
      ({ exercise_id, sets, reps, restSeconds }) => ({
        exercise_id,
        sets,
        reps,
        restSeconds,
      }),
    ),
  });
}

export function withRestForAll(
  draft: RoutineDraft,
  seconds: number,
): RoutineDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) => ({
      ...exercise,
      restSeconds: String(seconds),
    })),
  };
}
