import { useSyncExternalStore } from "react";
import type { RoutineRead } from "@/utils/api/routines";
import {
  createSession,
  createSetLogApi,
  deleteSetLogApi,
  updateSession,
  updateSetLogApi,
} from "@/utils/api/session";

export type ActiveSetLog = {
  backendId?: string; // UUID restituito da FastAPI
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
};

export type ActiveWorkoutSession = {
  sessionId: string | null; // UUID della sessione attiva nel backend
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

export async function initOrResumeWorkout(
  routine: RoutineRead,
): Promise<ActiveWorkoutSession> {
  if (activeSession && activeSession.routineId === routine.id) {
    return activeSession;
  }

  const nowIso = new Date().toISOString();

  // 1. Inizializzazione immediata in locale per reattività UI istantanea
  activeSession = {
    sessionId: null,
    routineId: routine.id,
    routineName: routine.name,
    currentExerciseIndex: 0,
    durationSeconds: 0,
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

  // 2. Creazione della sessione su FastAPI in background
  try {
    const sessionRes = await createSession({
      routine_id: routine.id,
      started_at: nowIso,
    });
    if (activeSession) {
      activeSession = { ...activeSession, sessionId: sessionRes.id };
      notify();
    }
  } catch (err) {
    console.error("Failed to create session on backend:", err);
  }

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

export async function createSetLog(exerciseId: string, setIndex: number) {
  if (!activeSession) return;
  const currentSet = activeSession.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  const weightNum = Math.max(0.1, Number.parseFloat(currentSet.weight) || 0);
  const repsNum = Math.max(1, Number.parseInt(currentSet.reps, 10) || 1);
  const rirNum =
    currentSet.rir.trim() !== "" ? Number.parseInt(currentSet.rir, 10) : null;

  // Ottimismo: segna subito completato nella UI
  const updatedSets = [...activeSession.workoutLogs[exerciseId]];
  updatedSets[setIndex] = { ...currentSet, completed: true };
  activeSession = {
    ...activeSession,
    workoutLogs: { ...activeSession.workoutLogs, [exerciseId]: updatedSets },
  };
  notify();

  // Chiamata backend se abbiamo già un sessionId valido
  if (activeSession.sessionId) {
    try {
      const res = await createSetLogApi(activeSession.sessionId, exerciseId, {
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

  // Se è stato deselezionato ed esisteva sul backend, eliminiamo il log
  if (
    changes.completed === false &&
    currentSet.backendId &&
    activeSession.sessionId
  ) {
    try {
      await deleteSetLogApi(activeSession.sessionId, currentSet.backendId);
      updatedSet.backendId = undefined;
      notify();
    } catch (err) {
      console.error("Failed to delete set log:", err);
    }
    return;
  }

  // Se il set è già a database e cambiano i numeri, facciamo PATCH
  if (
    updatedSet.backendId &&
    activeSession.sessionId &&
    (changes.weight !== undefined ||
      changes.reps !== undefined ||
      changes.rir !== undefined)
  ) {
    try {
      await updateSetLogApi(activeSession.sessionId, updatedSet.backendId, {
        weight:
          changes.weight !== undefined
            ? Number.parseFloat(changes.weight) || 0
            : undefined,
        reps:
          changes.reps !== undefined
            ? Number.parseInt(changes.reps, 10) || 1
            : undefined,
        rir:
          changes.rir !== undefined && changes.rir !== ""
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
  if (activeSession?.sessionId) {
    try {
      await updateSession(activeSession.sessionId, {
        status: "completed",
        ended_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to complete session on server:", err);
    }
  }
  activeSession = null;
  notify();
}
