import { useRef, useState } from "react";
import type { RoutineRead } from "@/features/routines/types";
import type { ExerciseRead } from "@/features/exercises/types";
import {
  toDraft,
  withRestForAll,
  type RoutineDraft,
  type RoutineExerciseDraft,
} from "@/features/routines/utils/routineDraft";

export function useRoutineDraft(routine: RoutineRead | undefined) {
  const [draft, setDraft] = useState<RoutineDraft>(() => toDraft(routine));

  const defaultRest = useRef("90");
  function setRestForAll(seconds: number) {
    defaultRest.current = String(seconds);
    setDraft((current) => withRestForAll(current, seconds));
  }

  function setName(name: string) {
    setDraft((current) => ({ ...current, name }));
  }

  function updateExercise(
    exerciseId: string,
    changes: Partial<RoutineExerciseDraft>,
  ) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...changes } : exercise,
      ),
    }));
  }

  function addExercise(exercise: ExerciseRead) {
    const draftId = `draft-${Date.now()}`;
    const restSeconds = defaultRest.current;
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: draftId,
          exercise_id: exercise.id,
          name: exercise.name,
          sets: "3",
          reps: "10",
          restSeconds,
        },
      ],
    }));
  }

  function removeExercise(exerciseId: string) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter(
        (exercise) => exercise.id !== exerciseId,
      ),
    }));
  }

  function moveExercise(exerciseId: string, direction: -1 | 1) {
    setDraft((current) => {
      const currentIndex = current.exercises.findIndex(
        (e) => e.id === exerciseId,
      );
      const nextIndex = currentIndex + direction;
      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= current.exercises.length
      ) {
        return current;
      }
      const exercises = [...current.exercises];
      const [moved] = exercises.splice(currentIndex, 1);
      exercises.splice(nextIndex, 0, moved);
      return { ...current, exercises };
    });
  }

  function reorderExercises(newExercises: RoutineExerciseDraft[]) {
    setDraft((current) => ({
      ...current,
      exercises: newExercises,
    }));
  }

  return {
    draft,
    setName,
    setRestForAll,
    updateExercise,
    addExercise,
    removeExercise,
    moveExercise,
    reorderExercises,
  };
}
