import { useSyncExternalStore } from "react";
import type { Routine } from "./routineStore";

export type ActiveSetLog = {
  backendId?: string; // Presente solo dopo la creazione nel backend
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
};

export type ActiveWorkoutSession = {
  routineId: string;
  routineName: string;
  currentExerciseIndex: number;
  durationSeconds: number;
  isPaused: boolean;
  workoutLogs: Record<string, ActiveSetLog[]>;
};

let activeSession: ActiveWorkoutSession | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveWorkout() {
  return activeSession;
}

export function useActiveWorkout() {
  return useSyncExternalStore(subscribe, getActiveWorkout, getActiveWorkout);
}

export function initOrResumeWorkout(routine: Routine): ActiveWorkoutSession {
  if (activeSession && activeSession.routineId === routine.id) {
    return activeSession;
  }

  activeSession = {
    routineId: routine.id,
    routineName: routine.name,
    currentExerciseIndex: 0,
    durationSeconds: 0,
    isPaused: false,
    workoutLogs: Object.fromEntries(
      routine.exercises.map((ex) => [
        ex.id,
        Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          weight: "",
          reps: String(ex.reps),
          rir: "",
          completed: false,
        })),
      ]),
    ),
  };
  notify();
  return activeSession;
}

export function toggleWorkoutPause() {
  if (!activeSession) return;
  activeSession = {
    ...activeSession,
    isPaused: !activeSession.isPaused,
  };
  notify();
}

export function tickWorkoutDuration() {
  if (!activeSession || activeSession.isPaused) return;
  activeSession = {
    ...activeSession,
    durationSeconds: activeSession.durationSeconds + 1,
  };
  notify();
}

export function setCurrentExerciseIndex(index: number) {
  if (!activeSession) return;
  activeSession = {
    ...activeSession,
    currentExerciseIndex: index,
  };
  notify();
}

// 1. CREA IL SET LOG (chiamata POST backend alla prima spunta di completamento)
export async function createSetLog(exerciseId: string, setIndex: number) {
  if (!activeSession) return;
  const currentSet = activeSession.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  // Placeholder chiamata API:
  // const res = await api.post(`/workouts/${activeSession.routineId}/sets`, { ... })
  const simulatedBackendId = `set-log-${Date.now()}`;

  const updatedSets = [...activeSession.workoutLogs[exerciseId]];
  updatedSets[setIndex] = {
    ...currentSet,
    completed: true,
    backendId: currentSet.backendId ?? simulatedBackendId,
  };

  activeSession = {
    ...activeSession,
    workoutLogs: {
      ...activeSession.workoutLogs,
      [exerciseId]: updatedSets,
    },
  };
  notify();
}

// 2. AGGIORNA IL SET LOG (chiamata PUT/PATCH backend se il set è già stato creato)
export async function updateSetLog(
  exerciseId: string,
  setIndex: number,
  changes: Partial<ActiveSetLog>,
) {
  if (!activeSession) return;
  const currentSet = activeSession.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  const updatedSet = { ...currentSet, ...changes };

  // Se il set ha già un id backend, aggiorniamo sul server
  if (updatedSet.backendId) {
    // await api.put(`/workouts/sets/${updatedSet.backendId}`, { ... })
  }

  const updatedSets = [...activeSession.workoutLogs[exerciseId]];
  updatedSets[setIndex] = updatedSet;

  activeSession = {
    ...activeSession,
    workoutLogs: {
      ...activeSession.workoutLogs,
      [exerciseId]: updatedSets,
    },
  };
  notify();
}

export function addSetToExercise(exerciseId: string, defaultReps: number) {
  if (!activeSession) return;
  const currentSets = activeSession.workoutLogs[exerciseId] ?? [];
  const newSet: ActiveSetLog = {
    setNumber: currentSets.length + 1,
    weight: currentSets[currentSets.length - 1]?.weight || "",
    reps: String(defaultReps),
    rir: "",
    completed: false,
  };

  activeSession = {
    ...activeSession,
    workoutLogs: {
      ...activeSession.workoutLogs,
      [exerciseId]: [...currentSets, newSet],
    },
  };
  notify();
}

export function finishWorkoutSession() {
  activeSession = null;
  notify();
}
