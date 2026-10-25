import { useSyncExternalStore } from "react";
import { calculateWorkoutDurationSeconds } from "@/utils/domain/workout";

export type ActiveSetLog = {
  backendId?: string;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
};

export type ActiveWorkoutSession = {
  sessionId: string | null;
  routineId: string;
  routineName: string;
  currentExerciseIndex: number;
  startedAtTimestamp: number;
  pausedAtTimestamp: number | null;
  accumulatedPauseMs: number;
  isPaused: boolean;
  workoutLogs: Record<string, ActiveSetLog[]>;
};

// --- STATO IN MEMORIA ---
let activeSession: ActiveWorkoutSession | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- GETTER & HOOK ---
export function getActiveWorkout() {
  return activeSession;
}

export function useActiveWorkout() {
  return useSyncExternalStore(subscribe, getActiveWorkout, getActiveWorkout);
}

export function getActiveWorkoutDurationSeconds(): number {
  if (!activeSession) return 0;
  return calculateWorkoutDurationSeconds(
    activeSession.startedAtTimestamp,
    activeSession.pausedAtTimestamp,
    activeSession.accumulatedPauseMs,
    activeSession.isPaused,
  );
}

// --- MUTAZIONI PURE DELLO STATO (SINCRONE) ---
export function setActiveWorkout(session: ActiveWorkoutSession | null) {
  activeSession = session;
  notify();
}

export function setSessionBackendId(sessionId: string) {
  if (!activeSession) return;
  activeSession = { ...activeSession, sessionId };
  notify();
}

export function toggleWorkoutPause() {
  if (!activeSession) return;
  const now = Date.now();
  if (activeSession.isPaused) {
    const pauseDuration = activeSession.pausedAtTimestamp
      ? now - activeSession.pausedAtTimestamp
      : 0;
    activeSession = {
      ...activeSession,
      isPaused: false,
      pausedAtTimestamp: null,
      accumulatedPauseMs: activeSession.accumulatedPauseMs + pauseDuration,
    };
  } else {
    activeSession = {
      ...activeSession,
      isPaused: true,
      pausedAtTimestamp: now,
    };
  }
  notify();
}

export function setCurrentExerciseIndex(index: number) {
  if (!activeSession) return;
  activeSession = { ...activeSession, currentExerciseIndex: index };
  notify();
}

export function updateLocalSetLog(
  exerciseId: string,
  setIndex: number,
  changes: Partial<ActiveSetLog>,
) {
  if (!activeSession) return;
  const currentSets = activeSession.workoutLogs[exerciseId] ?? [];
  const targetSet = currentSets[setIndex];
  if (!targetSet) return;

  const updatedSets = [...currentSets];
  updatedSets[setIndex] = { ...targetSet, ...changes };

  activeSession = {
    ...activeSession,
    workoutLogs: { ...activeSession.workoutLogs, [exerciseId]: updatedSets },
  };
  notify();
}

export function addLocalSetToExercise(exerciseId: string, defaultReps: number) {
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

export function clearActiveWorkout() {
  activeSession = null;
  notify();
}
