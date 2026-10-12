import { useSyncExternalStore } from "react";

export type RoutineExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export type Routine = {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: RoutineExercise[];
};

const INITIAL_ROUTINES: Routine[] = [
  {
    id: "upper-body",
    name: "Upper body",
    muscleGroups: ["Chest", "Back", "Shoulders", "Biceps"],
    exercises: [
      { id: "bench-press", name: "Bench press", sets: 4, reps: 8, restSeconds: 120 },
      { id: "barbell-row", name: "Barbell row", sets: 4, reps: 8, restSeconds: 120 },
      { id: "shoulder-press", name: "Shoulder press", sets: 3, reps: 10, restSeconds: 90 },
      { id: "lat-pulldown", name: "Lat pulldown", sets: 3, reps: 10, restSeconds: 90 },
      { id: "cable-curl", name: "Cable curl", sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: "lower-body",
    name: "Lower body",
    muscleGroups: ["Quads", "Hamstrings", "Glutes", "Calves"],
    exercises: [
      { id: "back-squat", name: "Back squat", sets: 4, reps: 6, restSeconds: 150 },
      { id: "romanian-deadlift", name: "Romanian deadlift", sets: 3, reps: 8, restSeconds: 120 },
      { id: "leg-press", name: "Leg press", sets: 3, reps: 10, restSeconds: 90 },
      { id: "leg-curl", name: "Leg curl", sets: 3, reps: 12, restSeconds: 75 },
      { id: "calf-raise", name: "Standing calf raise", sets: 4, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: "full-body",
    name: "Full body",
    muscleGroups: ["Chest", "Back", "Shoulders", "Legs", "Core"],
    exercises: [
      { id: "deadlift", name: "Deadlift", sets: 3, reps: 5, restSeconds: 180 },
      { id: "incline-press", name: "Incline dumbbell press", sets: 3, reps: 10, restSeconds: 90 },
      { id: "goblet-squat", name: "Goblet squat", sets: 3, reps: 12, restSeconds: 90 },
      { id: "seated-row", name: "Seated row", sets: 3, reps: 10, restSeconds: 90 },
      { id: "plank", name: "Plank", sets: 3, reps: 1, restSeconds: 60 },
      { id: "lateral-raise", name: "Lateral raise", sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
];

let routines = INITIAL_ROUTINES;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getRoutines() {
  return routines;
}

export function useRoutines() {
  return useSyncExternalStore(subscribe, getRoutines, getRoutines);
}

export function getRoutine(routineId: string) {
  return routines.find((routine) => routine.id === routineId);
}

export function saveRoutine(routine: Routine) {
  const routineToSave =
    routine.id === "new"
      ? { ...routine, id: `routine-${Date.now()}` }
      : routine;

  const existingRoutine = routines.some(
    (candidate) => candidate.id === routineToSave.id,
  );

  routines = existingRoutine
    ? routines.map((candidate) =>
        candidate.id === routineToSave.id ? routineToSave : candidate,
      )
    : [...routines, routineToSave];
  notify();

  return routineToSave;
}
