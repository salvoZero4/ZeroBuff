import type { RoutineRead } from "@/utils/api/routines";
import { queryClient } from "@/utils/api/queryClient";
import {
  createSession,
  createSetLogApi,
  deleteSetLogApi,
  updateSession,
  updateSetLogApi,
} from "@/utils/api/session";
import {
  clearActiveWorkout,
  getActiveWorkout,
  setActiveWorkout,
  setSessionBackendId,
  updateLocalSetLog,
  type ActiveSetLog,
} from "@/utils/stores/activeWorkoutStore";

/**
 * Calcola la durata attuale della sessione in secondi
 * al netto delle pause.
 */
export function calculateWorkoutDurationSeconds(
  startedAtTimestamp: number,
  pausedAtTimestamp: number | null,
  accumulatedPauseMs: number,
  isPaused: boolean,
): number {
  const now = isPaused && pausedAtTimestamp ? pausedAtTimestamp : Date.now();
  const totalElapsedMs = now - startedAtTimestamp - accumulatedPauseMs;
  return Math.max(0, Math.floor(totalElapsedMs / 1000));
}

/**
 * Normalizza e valida gli input utente trasformandoli
 * nei valori numerici per il backend.
 */
export function parseSetInputValues(
  weightStr: string,
  repsStr: string,
  rirStr: string,
) {
  const parsedWeight = Number.parseFloat(weightStr.replace(",", "."));
  const weightNum = Math.max(
    0.1,
    Number.isFinite(parsedWeight) ? parsedWeight : 0.1,
  );
  const repsNum = Math.max(1, Number.parseInt(repsStr, 10) || 1);
  const rirNum = rirStr.trim() !== "" ? Number.parseInt(rirStr, 10) : null;

  return { weightNum, repsNum, rirNum };
}

let sessionCreationPromise: Promise<string | null> | null = null;

async function ensureSessionId(): Promise<string | null> {
  const session = getActiveWorkout();
  if (session?.sessionId) return session.sessionId;
  if (sessionCreationPromise) return await sessionCreationPromise;
  return null;
}

export async function initOrResumeWorkout(routine: RoutineRead) {
  const activeSession = getActiveWorkout();
  if (activeSession && activeSession.routineId === routine.id) {
    return activeSession;
  }

  const now = Date.now();
  setActiveWorkout({
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
  });

  sessionCreationPromise = createSession({
    routine_id: routine.id,
    started_at: now.toString(),
  })
    .then((sessionRes) => {
      setSessionBackendId(sessionRes.id);
      return sessionRes.id;
    })
    .catch((err) => {
      console.error("Failed to create session on server:", err);
      return null;
    })
    .finally(() => {
      sessionCreationPromise = null;
    });

  await sessionCreationPromise;
}

export async function logSetCompleted(exerciseId: string, setIndex: number) {
  const session = getActiveWorkout();
  if (!session) return;

  const currentSet = session.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  // Optimistic update locale
  updateLocalSetLog(exerciseId, setIndex, { completed: true });

  const { weightNum, repsNum, rirNum } = parseSetInputValues(
    currentSet.weight,
    currentSet.reps,
    currentSet.rir,
  );

  const sessionId = await ensureSessionId();
  if (sessionId) {
    try {
      const res = await createSetLogApi(sessionId, exerciseId, {
        set_number: currentSet.setNumber,
        weight: weightNum,
        reps: repsNum,
        rir: rirNum,
      });
      updateLocalSetLog(exerciseId, setIndex, { backendId: res.id });
    } catch (err) {
      console.error("Failed to log set to server:", err);
    }
  }
}

export async function updateOrDeleteSetLog(
  exerciseId: string,
  setIndex: number,
  changes: Partial<ActiveSetLog>,
) {
  const session = getActiveWorkout();
  if (!session) return;

  const currentSet = session.workoutLogs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  updateLocalSetLog(exerciseId, setIndex, changes);

  const sessionId = await ensureSessionId();
  if (!sessionId) return;

  // Deselezione -> DELETE
  if (changes.completed === false && currentSet.backendId) {
    try {
      await deleteSetLogApi(sessionId, currentSet.backendId);
      updateLocalSetLog(exerciseId, setIndex, { backendId: undefined });
    } catch (err) {
      console.error("Failed to delete set log:", err);
    }
    return;
  }

  // Modifica valori -> PATCH
  const updatedSet = { ...currentSet, ...changes };
  if (
    updatedSet.backendId &&
    (changes.weight !== undefined ||
      changes.reps !== undefined ||
      changes.rir !== undefined)
  ) {
    try {
      const { weightNum, repsNum, rirNum } = parseSetInputValues(
        updatedSet.weight,
        updatedSet.reps,
        updatedSet.rir,
      );

      await updateSetLogApi(sessionId, updatedSet.backendId, {
        weight: changes.weight !== undefined ? weightNum : undefined,
        reps: changes.reps !== undefined ? repsNum : undefined,
        rir: changes.rir !== undefined ? rirNum : undefined,
      });
    } catch (err) {
      console.error("Failed to update set log:", err);
    }
  }
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

  clearActiveWorkout();
}
