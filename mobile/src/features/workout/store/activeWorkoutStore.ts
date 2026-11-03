import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { tokenStore } from "@/features/auth/store/tokenStore";
import { WorkoutDraftStorage } from "../storage/workoutDraftStorage";
import { calculateWorkoutDurationSeconds } from "../utils/duration";
import type {
  ActiveSetLog,
  ActiveWorkoutSession,
} from "../types/activeWorkout";

type ActiveWorkoutActions = {
  setActiveWorkout: (session: ActiveWorkoutSession | null) => void;
  setSessionBackendId: (sessionId: string) => void;
  toggleWorkoutPause: () => void;
  setCurrentExerciseIndex: (index: number) => void;
  updateLocalSetLog: (
    exerciseId: string,
    setIndex: number,
    changes: Partial<ActiveSetLog>,
  ) => void;
  addLocalSetToExercise: (exerciseId: string, defaultReps: number) => void;
  removeLocalSetFromExercise: (exerciseId: string, setIndex: number) => void;
  clearActiveWorkout: () => void;
  setWorkoutFinishing: (isFinishing: boolean) => void;
  editSetLog: (
    exerciseId: string,
    setIndex: number,
    changes: Partial<ActiveSetLog>,
  ) => void;
  setWorkoutRestEndTimestamp: (restEndTimestamp: number | null) => void;
  toggleAutoRest: () => void;
  pauseWorkout: () => void;
  applyNativeRestTimer: (state: {
    id: string;
    workoutKey: string;
    endAt: number;
    status: string;
  }) => void;
};
export type ActiveWorkoutState = ActiveWorkoutActions & {
  session: ActiveWorkoutSession | null;
  persistenceError: string | null;
};

const drafts = new WorkoutDraftStorage(AsyncStorage);
let revision = 0;
let hydratedScope: string | null = null;
let storageScope: string | null = null;
let hydration: {
  scope: string;
  promise: Promise<ActiveWorkoutSession | null>;
} | null = null;

function reportPersistenceError(message: string | null) {
  if (activeWorkoutStore.getState().persistenceError !== message)
    activeWorkoutStore.setState({ persistenceError: message });
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

export const getWorkoutPersistenceError = () =>
  activeWorkoutStore.getState().persistenceError;

export function useWorkoutPersistenceError() {
  return useActiveWorkoutStore((state) => state.persistenceError);
}

/** Read disk before server recovery; late reads must never overwrite a newer edit. */
export async function restoreActiveWorkout(): Promise<ActiveWorkoutSession | null> {
  const scope = tokenStore.getSessionScope();
  if (!scope) return null;
  if (hydratedScope === scope) return getActiveWorkout();
  if (hydration?.scope === scope) return hydration.promise;
  const before = revision;
  const promise = drafts
    .read(scope)
    .then((saved) => {
      if (tokenStore.getSessionScope() !== scope) return null;
      hydratedScope = scope;
      storageScope = scope;
      if (revision === before) {
        reportPersistenceError(null);
        setActiveWorkout(saved);
      }
      return getActiveWorkout();
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
  if (scope) await persist(scope, getActiveWorkout());
}

export const flushWorkoutPersistence = () => drafts.flush();

let restSequence = 0;

export const activeWorkoutStore = createStore<ActiveWorkoutState>()(
  (set, get) => ({
    session: null,
    persistenceError: null,
    setActiveWorkout: (session: ActiveWorkoutSession | null) => {
      set({ session });
    },
    setSessionBackendId: (sessionId: string) => {
      const activeSession = get().session;
      if (!activeSession) return;
      set({ session: { ...activeSession, sessionId } });
    },
    toggleWorkoutPause: () => {
      const session = get().session;
      if (!session) return;
      const now = Date.now();
      set({
        session: session.isPaused
          ? {
              ...session,
              isPaused: false,
              pausedAtTimestamp: null,
              accumulatedPauseMs:
                session.accumulatedPauseMs +
                (session.pausedAtTimestamp
                  ? now - session.pausedAtTimestamp
                  : 0),
            }
          : {
              ...session,
              isPaused: true,
              pausedAtTimestamp: now,
            },
      });
    },
    setCurrentExerciseIndex: (index: number) => {
      const activeSession = get().session;
      if (!activeSession) return;
      set({ session: { ...activeSession, currentExerciseIndex: index } });
    },
    updateLocalSetLog: (
      exerciseId: string,
      setIndex: number,
      changes: Partial<ActiveSetLog>,
    ) => {
      const activeSession = get().session;
      if (!activeSession) return;
      const currentSets = activeSession.workoutLogs[exerciseId] ?? [];
      const targetSet = currentSets[setIndex];
      if (!targetSet) return;

      const updatedSets = [...currentSets];
      updatedSets[setIndex] = { ...targetSet, ...changes };

      set({
        session: {
          ...activeSession,
          workoutLogs: {
            ...activeSession.workoutLogs,
            [exerciseId]: updatedSets,
          },
        },
      });
    },
    addLocalSetToExercise: (exerciseId: string, defaultReps: number) => {
      const activeSession = get().session;
      if (!activeSession) return;
      const currentSets = activeSession.workoutLogs[exerciseId] ?? [];
      const newSet: ActiveSetLog = {
        setNumber: currentSets.length + 1,
        weight: currentSets[currentSets.length - 1]?.weight || "",
        reps: String(defaultReps),
        rir: "",
        completed: false,
      };

      set({
        session: {
          ...activeSession,
          workoutLogs: {
            ...activeSession.workoutLogs,
            [exerciseId]: [...currentSets, newSet],
          },
        },
      });
    },
    removeLocalSetFromExercise: (exerciseId: string, setIndex: number) => {
      const activeSession = get().session;
      if (!activeSession) return;
      const currentSets = activeSession.workoutLogs[exerciseId] ?? [];
      if (setIndex < 0 || setIndex >= currentSets.length) return;

      // Contiguous renumbering: the backend works with set_number
      const updatedSets = currentSets
        .filter((_, idx) => idx !== setIndex)
        .map((set, idx) => ({ ...set, setNumber: idx + 1 }));

      set({
        session: {
          ...activeSession,
          workoutLogs: {
            ...activeSession.workoutLogs,
            [exerciseId]: updatedSets,
          },
        },
      });
    },
    clearActiveWorkout: () => {
      const oldScope = storageScope;
      const scope = tokenStore.getSessionScope();
      const wasEmpty = get().session === null;
      // A clear must cancel hydration even when memory was already empty.
      revision++;
      hydratedScope = scope;
      set({ session: null, persistenceError: null });
      if (wasEmpty && scope) void persist(scope, null);
      // Session expiry clears tokens before its callback.
      if (oldScope && oldScope !== scope)
        void drafts.write(oldScope, null).catch(() => {});
      storageScope = scope;
    },
    setWorkoutFinishing: (isFinishing: boolean) => {
      const activeSession = get().session;
      if (!activeSession) return;
      set({ session: { ...activeSession, isFinishing } });
    },
    editSetLog: (
      exerciseId: string,
      setIndex: number,
      changes: Partial<ActiveSetLog>,
    ) => {
      const activeSession = get().session;
      const set = activeSession?.workoutLogs[exerciseId]?.[setIndex];
      if (!set || activeSession?.isFinishing || set.saveStatus === "pending")
        return;
      get().updateLocalSetLog(exerciseId, setIndex, {
        ...changes,
        touched: true,
        saveStatus:
          set.backendId ||
          set.saveStatus === "error" ||
          set.saveStatus === "dirty"
            ? "dirty"
            : undefined,
        saveError: undefined,
      });
    },
    setWorkoutRestEndTimestamp: (restEndTimestamp: number | null) => {
      const activeSession = get().session;
      if (!activeSession) return;
      const starting =
        restEndTimestamp !== null &&
        (!activeSession.restEndTimestamp ||
          activeSession.restEndTimestamp <= Date.now());
      set({
        session: {
          ...activeSession,
          restEndTimestamp,
          restTimerId: starting
            ? `${activeSession.startedAtTimestamp}:${Date.now()}:${++restSequence}`
            : activeSession.restTimerId,
        },
      });
    },
    toggleAutoRest: () => {
      const activeSession = get().session;
      if (!activeSession) return;
      set({
        session: {
          ...activeSession,
          autoRestEnabled: !(activeSession.autoRestEnabled ?? true),
        },
      });
    },
    pauseWorkout: () => {
      const activeSession = get().session;
      if (activeSession && !activeSession.isPaused) get().toggleWorkoutPause();
    },
    applyNativeRestTimer: (state: {
      id: string;
      workoutKey: string;
      endAt: number;
      status: string;
    }) => {
      const activeSession = get().session;
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
      set({
        session: { ...activeSession, restTimerId: state.id, restEndTimestamp },
      });
    },
  }),
);

// Persist only session changes: error feedback and stable actions never write to disk.
activeWorkoutStore.subscribe((state, previous) => {
  if (state.session === previous.session) return;
  revision++;
  const scope = tokenStore.getSessionScope();
  if (scope) void persist(scope, state.session);
});

export function useActiveWorkoutStore<T>(
  selector: (state: ActiveWorkoutState) => T,
): T {
  return useStore(activeWorkoutStore, selector);
}

export const getActiveWorkout = () => activeWorkoutStore.getState().session;
export const useActiveWorkout = () =>
  useActiveWorkoutStore((state) => state.session);

// Stable actions preserve the imperative API used by async workout operations and native events.
export const {
  setActiveWorkout,
  setSessionBackendId,
  toggleWorkoutPause,
  setCurrentExerciseIndex,
  updateLocalSetLog,
  addLocalSetToExercise,
  removeLocalSetFromExercise,
  clearActiveWorkout,
  setWorkoutFinishing,
  editSetLog,
  setWorkoutRestEndTimestamp,
  toggleAutoRest,
  pauseWorkout,
  applyNativeRestTimer,
} = activeWorkoutStore.getState();

export function getActiveWorkoutDurationSeconds(): number {
  const activeSession = getActiveWorkout();
  if (!activeSession) return 0;
  return calculateWorkoutDurationSeconds(
    activeSession.startedAtTimestamp,
    activeSession.pausedAtTimestamp,
    activeSession.accumulatedPauseMs,
    activeSession.isPaused,
  );
}
