import type { ExerciseRead } from "@/features/exercises/types";

type ExerciseSelectCallback = (exercise: ExerciseRead) => void;

let onSelectCallback: ExerciseSelectCallback | null = null;

export function openExercisePicker(onSelect: ExerciseSelectCallback) {
  onSelectCallback = onSelect;
}

export function selectExercise(exercise: ExerciseRead) {
  if (onSelectCallback) {
    onSelectCallback(exercise);
    onSelectCallback = null;
  }
}

export function clearExercisePicker() {
  onSelectCallback = null;
}
