import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokenStore } from "@/features/auth/store/tokenStore";
import { WorkoutDraftStorage } from "../storage/workoutDraftStorage";
import { useSyncExternalStore } from "react";
import { calculateWorkoutDurationSeconds } from "@/features/workout/utils/duration";

export type ActiveSetLog = {
  backendId?: string;
  saveStatus?: "pending" | "saved" | "error" | "dirty";
  saveError?: string;
  retryAction?: "save" | "delete" | "remove";
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
  restTimerId?: string;
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

const drafts = new WorkoutDraftStorage(AsyncStorage);
let revision = 0;
let hydratedScope: string | null = null;
let storageScope: string | null = null;
let hydration: {
  scope: string;
  promise: Promise<ActiveWorkoutSession | null>;
} | null = null;
let persistenceError: string | null = null;

function reportPersistenceError(message: string | null) {
  if (persistenceError === message) return;
  persistenceError = message;
  listeners.forEach((listener) => listener());
}

function persist(scope: string, session: ActiveWorkoutSession | null) {
  storageScope = scope;
  return drafts.write(scope, session).then(
    () => {
      if (tokenStore.getSessionScope() === scope) reportPersistenceError(null);
    },
    () => {
      if (tokenStore.getSessionScope() === scope)
        reportPersistenceError(
          "Changes couldn’t be backed up on this device. Keep the app open and try again.",
        );
    },
  );
}

function notify() {
  revision++;
  const scope = tokenStore.getSessionScope();
  if (scope) void persist(scope, activeSession);
  listeners.forEach((listener) => listener());
}

export const getWorkoutPersistenceError = () => persistenceError;

export function useWorkoutPersistenceError() {
  return useSyncExternalStore(
    subscribe,
    getWorkoutPersistenceError,
    () => null,
  );
}

/** Read disk before server recovery; late reads must never overwrite a newer edit. */
export async function restoreActiveWorkout(): Promise<ActiveWorkoutSession | null> {
  const scope = tokenStore.getSessionScope();
  if (!scope) return null;
  if (hydratedScope === scope) return activeSession;
  if (hydration?.scope === scope) return hydration.promise;
  const before = revision;
  const promise = drafts
    .read(scope)
    .then((saved) => {
      if (tokenStore.getSessionScope() !== scope) return null;
      hydratedScope = scope;
      storageScope = scope;
      if (revision === before) {
        activeSession = saved;
        // Persist normalized interrupted requests, too.
        notify();
      }
      return activeSession;
    })
    .catch((error: unknown) => {
      if (tokenStore.getSessionScope() === scope)
        reportPersistenceError(
          error instanceof Error
            ? error.message
            : "Your saved workout couldn’t be read. Please try again.",
        );
      throw error;
    })
    .finally(() => {
      if (hydration?.promise === promise) hydration = null;
    });
  hydration = { scope, promise };
  return promise;
}

export async function retryWorkoutPersistence() {
  await restoreActiveWorkout();
  const scope = tokenStore.getSessionScope();
  if (scope) await persist(scope, activeSession);
}

export const flushWorkoutPersistence = () => drafts.flush();

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
  const oldScope = storageScope;
  activeSession = null;
  reportPersistenceError(null);
  hydratedScope = tokenStore.getSessionScope();
  notify();
  // Session expiry clears tokens before its callback. Still remove the old draft.
  if (oldScope && oldScope !== tokenStore.getSessionScope())
    void drafts.write(oldScope, null).catch(() => {});
  storageScope = tokenStore.getSessionScope();
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
  const starting =
    restEndTimestamp !== null &&
    (!activeSession.restEndTimestamp ||
      activeSession.restEndTimestamp <= Date.now());
  activeSession = {
    ...activeSession,
    restEndTimestamp,
    restTimerId: starting
      ? `${activeSession.startedAtTimestamp}:${Date.now()}:${++restSequence}`
      : activeSession.restTimerId,
  };
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

let restSequence = 0;

export function applyNativeRestTimer(state: {
  id: string;
  workoutKey: string;
  endAt: number;
  status: string;
}) {
  if (
    !activeSession ||
    state.workoutKey !==
      `${activeSession.routineId}:${activeSession.startedAtTimestamp}`
  )
    return;
  if (activeSession.restTimerId && activeSession.restTimerId !== state.id)
    return;
  const restEndTimestamp = state.status === "skipped" ? null : state.endAt;
  if (
    activeSession.restTimerId === state.id &&
    activeSession.restEndTimestamp === restEndTimestamp
  )
    return;
  activeSession = { ...activeSession, restTimerId: state.id, restEndTimestamp };
  notify();
}
