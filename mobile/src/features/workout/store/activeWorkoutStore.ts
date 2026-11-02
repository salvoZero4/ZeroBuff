import { useSyncExternalStore } from "react";
import { calculateWorkoutDurationSeconds } from "@/features/workout/utils/workout";

export type ActiveSetLog = {
  backendId?: string;
  saveStatus?: "pending" | "saved" | "error" | "dirty";
  saveError?: string;
  retryAction?: "save" | "delete";
  needsReconcile?: boolean;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
  // Set to true as soon as the user edits the set: prefills must never
  // overwrite a value the user cleared or changed.
  touched?: boolean;
};

export type ActiveWorkoutSession = {
  isFinishing?: boolean;
  autoRestEnabled?: boolean;
  restEndTimestamp?: number | null;
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

export function removeLocalSetFromExercise(
  exerciseId: string,
  setIndex: number,
) {
  if (!activeSession) return;
  const currentSets = activeSession.workoutLogs[exerciseId] ?? [];
  if (setIndex < 0 || setIndex >= currentSets.length) return;

  // Contiguous renumbering: the backend works with set_number
  const updatedSets = currentSets
    .filter((_, idx) => idx !== setIndex)
    .map((set, idx) => ({ ...set, setNumber: idx + 1 }));

  activeSession = {
    ...activeSession,
    workoutLogs: {
      ...activeSession.workoutLogs,
      [exerciseId]: updatedSets,
    },
  };
  notify();
}

export function clearActiveWorkout() {
  activeSession = null;
  notify();
}

export function setWorkoutFinishing(isFinishing: boolean) {
  if (!activeSession) return;
  activeSession = { ...activeSession, isFinishing };
  notify();
}

export function editSetLog(
  exerciseId: string,
  setIndex: number,
  changes: Partial<ActiveSetLog>,
) {
  const set = activeSession?.workoutLogs[exerciseId]?.[setIndex];
  if (!set || activeSession?.isFinishing || set.saveStatus === "pending")
    return;
  updateLocalSetLog(exerciseId, setIndex, {
    ...changes,
    touched: true,
    saveStatus:
      set.backendId || set.saveStatus === "error" || set.saveStatus === "dirty"
        ? "dirty"
        : undefined,
    saveError: undefined,
  });
}

export function setWorkoutRestEndTimestamp(restEndTimestamp: number | null) {
  if (!activeSession) return;
  activeSession = { ...activeSession, restEndTimestamp };
  notify();
}

export function toggleAutoRest() {
  if (!activeSession) return;
  activeSession = {
    ...activeSession,
    autoRestEnabled: !(activeSession.autoRestEnabled ?? true),
  };
  notify();
}

export function pauseWorkout() {
  if (activeSession && !activeSession.isPaused) toggleWorkoutPause();
}
