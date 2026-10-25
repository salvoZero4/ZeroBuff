import { useSyncExternalStore } from "react";
import type { RoutineRead } from "@/utils/api/routines";
import { queryClient } from "@/utils/api/queryClient";
import {
  createSession,
  createSetLogApi,
  deleteSetLogApi,
  updateSession,
  updateSetLogApi,
} from "@/utils/api/session";

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

let activeSession: ActiveWorkoutSession | null = null;
let sessionCreationPromise: Promise<string | null> | null = null;
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

export function cancelActiveWorkoutSession() {
  activeSession = null;
  sessionCreationPromise = null;
  notify();
}

export function getActiveWorkoutDurationSeconds(): number {
  if (!activeSession) return 0;

  const now =
    activeSession.isPaused && activeSession.pausedAtTimestamp
      ? activeSession.pausedAtTimestamp
      : Date.now();

  const totalElapsedMs =
    now - activeSession.startedAtTimestamp - activeSession.accumulatedPauseMs;
  return Math.max(0, Math.floor(totalElapsedMs / 1000));
}

export function useActiveWorkout() {
  return useSyncExternalStore(subscribe, getActiveWorkout, getActiveWorkout);
}

// Helper interno che attende l'ID sessione se la POST iniziale è ancora in volo
async function ensureSessionId(): Promise<string | null> {
  if (activeSession?.sessionId) return activeSession.sessionId;
  if (sessionCreationPromise) return await sessionCreationPromise;
  return null;
}

export async function initOrResumeWorkout(
  routine: RoutineRead,
): Promise<ActiveWorkoutSession> {
  if (activeSession && activeSession.routineId === routine.id) {
    return activeSession;
  }

  const now = Date.now();

  activeSession = {
    sessionId: null,
    routineId: routine.id,
    routineName: routine.name,
    currentExerciseIndex: 0,
    startedAtTimestamp: now,
    pausedAtTimestamp: null,
    accumulatedPauseMs: 0,
    isPaused: false,
    workoutLogs: Object.fromEntries(
      routine.exercises.map((ex) => [
        ex.exercise_id,
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

  sessionCreationPromise = createSession({
    routine_id: routine.id,
    started_at: now.toString(),
  })
    .then((sessionRes) => {
      if (activeSession && activeSession.routineId === routine.id) {
        activeSession = { ...activeSession, sessionId: sessionRes.id };
        notify();
      }
      return sessionRes.id;
    })
    .catch((err) => {
      console.error("Failed to create session on the server:", err);
      return null;
    })
    .finally(() => {
      sessionCreationPromise = null;
    });

  await sessionCreationPromise;
  return activeSession!;
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

export function tickWorkoutDuration() {
  if (!activeSession || activeSession.isPaused) return;
  activeSession = { ...activeSession };
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

export async function createSetLog(exerciseId: string, setIndex: number) {
  if (!activeSession) return;
  const currentSet = activeSession.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  const parsedWeight = Number.parseFloat(currentSet.weight.replace(",", "."));
  const weightNum = Math.max(
    0.1,
    Number.isFinite(parsedWeight) ? parsedWeight : 0.1,
  );
  const repsNum = Math.max(1, Number.parseInt(currentSet.reps, 10) || 1);
  const rirNum =
    currentSet.rir.trim() !== "" ? Number.parseInt(currentSet.rir, 10) : null;

  const updatedSets = [...activeSession.workoutLogs[exerciseId]];
  updatedSets[setIndex] = { ...currentSet, completed: true };
  activeSession = {
    ...activeSession,
    workoutLogs: { ...activeSession.workoutLogs, [exerciseId]: updatedSets },
  };
  notify();

  const sessionId = await ensureSessionId();
  if (sessionId) {
    try {
      const res = await createSetLogApi(sessionId, exerciseId, {
        set_number: currentSet.setNumber,
        weight: weightNum,
        reps: repsNum,
        rir: rirNum,
      });

      if (activeSession) {
        const latestSets = [...activeSession.workoutLogs[exerciseId]];
        latestSets[setIndex] = { ...latestSets[setIndex], backendId: res.id };
        activeSession = {
          ...activeSession,
          workoutLogs: {
            ...activeSession.workoutLogs,
            [exerciseId]: latestSets,
          },
        };
        notify();
      }
    } catch (err) {
      console.error("Failed to log set to server:", err);
    }
  }
}

export async function updateSetLog(
  exerciseId: string,
  setIndex: number,
  changes: Partial<ActiveSetLog>,
) {
  if (!activeSession) return;
  const currentSet = activeSession.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  const updatedSet = { ...currentSet, ...changes };
  const updatedSets = [...activeSession.workoutLogs[exerciseId]];
  updatedSets[setIndex] = updatedSet;
  activeSession = {
    ...activeSession,
    workoutLogs: { ...activeSession.workoutLogs, [exerciseId]: updatedSets },
  };
  notify();

  const sessionId = await ensureSessionId();
  if (!sessionId) return;

  if (changes.completed === false && currentSet.backendId) {
    try {
      await deleteSetLogApi(sessionId, currentSet.backendId);
      updatedSet.backendId = undefined;
      notify();
    } catch (err) {
      console.error("Failed to delete set log:", err);
    }
    return;
  }

  if (
    updatedSet.backendId &&
    (changes.weight !== undefined ||
      changes.reps !== undefined ||
      changes.rir !== undefined)
  ) {
    try {
      await updateSetLogApi(sessionId, updatedSet.backendId, {
        weight:
          changes.weight !== undefined
            ? Math.max(
                0,
                Number.parseFloat(changes.weight.replace(",", ".")) || 0,
              )
            : undefined,
        reps:
          changes.reps !== undefined
            ? Math.max(1, Number.parseInt(changes.reps, 10) || 1)
            : undefined,
        rir:
          changes.rir !== undefined && changes.rir.trim() !== ""
            ? Number.parseInt(changes.rir, 10)
            : null,
      });
    } catch (err) {
      console.error("Failed to update set log:", err);
    }
  }
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

export async function finishWorkoutSession() {
  const sessionId = await ensureSessionId();
  if (sessionId) {
    try {
      await updateSession(sessionId, {
        status: "completed",
        ended_at: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      console.error("Failed to complete session on server:", err);
    }
  }
  activeSession = null;
  sessionCreationPromise = null;
  notify();
}
