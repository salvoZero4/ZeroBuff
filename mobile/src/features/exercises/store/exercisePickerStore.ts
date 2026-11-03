import { createStore } from "zustand/vanilla";
import type { ExerciseRead } from "@/features/exercises/types";

type ExerciseSelectCallback = (exercise: ExerciseRead) => void;

type ExercisePickerState = {
  onSelect: ExerciseSelectCallback | null;
  openExercisePicker: (onSelect: ExerciseSelectCallback) => void;
  selectExercise: (exercise: ExerciseRead) => void;
  clearExercisePicker: () => void;
};

// Callbacks belong to this in-memory interaction and must never be persisted.
export const exercisePickerStore = createStore<ExercisePickerState>()(
  (set, get) => ({
    onSelect: null,
    openExercisePicker: (onSelect) => set({ onSelect }),
    selectExercise: (exercise) => {
      const callback = get().onSelect;
      if (!callback) return;
      // Consume first: exceptions, double taps or a newly opened picker cannot reuse it.
      set({ onSelect: null });
      callback(exercise);
    },
    clearExercisePicker: () => set({ onSelect: null }),
  }),
);

export const { openExercisePicker, selectExercise, clearExercisePicker } =
  exercisePickerStore.getState();
