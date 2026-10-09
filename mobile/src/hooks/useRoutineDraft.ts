import { useState } from "react";

import type { Routine } from "@/utils/routineStore";
import {
  toDraft,
  type RoutineDraft,
  type RoutineExerciseDraft,
} from "../utils/routineDraft";

export function useRoutineDraft(routine: Routine | undefined) {
  const [draft, setDraft] = useState<RoutineDraft>(() => toDraft(routine));

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

  function addExercise() {
    const exerciseId = `exercise-${Date.now()}`;
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: exerciseId,
          name: `Exercise ${current.exercises.length + 1}`,
          sets: "3",
          reps: "10",
          restSeconds: "90",
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
    updateExercise,
    addExercise,
    removeExercise,
    moveExercise,
    reorderExercises,
  };
}
