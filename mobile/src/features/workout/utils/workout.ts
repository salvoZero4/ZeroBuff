import { getRoutine } from "@/features/routines/api/routines";
import type { RoutineRead } from "@/features/routines/types/routine";
import { queryClient } from "@/shared/api/queryClient";
import { ApiError } from "@/shared/api/errors";
import {
  createSession,
  createSetLogApi,
  deleteSetLogApi,
  getSessionDetails,
  getSessions,
  updateSession,
  updateSetLogApi,
} from "@/features/workout/api/session";
import type { SessionDetailRead, SessionRead } from "@/features/workout/types/session";
import {
  clearActiveWorkout,
  getActiveWorkout,
  removeLocalSetFromExercise,
  setActiveWorkout,
  setSessionBackendId,
  updateLocalSetLog,
  type ActiveSetLog,
  type ActiveWorkoutSession,
} from "@/features/workout/store/activeWorkoutStore";

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

/**
 * Rebuild the in-memory session from a server session and its logged sets.
 * The routine supplies the exercise order and the target sets/reps.
 */
function buildSessionFromServer(
  routine: RoutineRead,
  detail: SessionDetailRead,
): ActiveWorkoutSession {
  const targetReps = new Map(
    routine.exercises.map((ex) => [ex.exercise_id, ex.reps]),
  );

  const workoutLogs: Record<string, ActiveSetLog[]> = {};
  for (const ex of routine.exercises) {
    workoutLogs[ex.exercise_id] = Array.from({ length: ex.sets }, (_, i) => ({
      setNumber: i + 1,
      weight: "",
      reps: String(ex.reps),
      rir: "",
      completed: false,
    }));
  }

  for (const log of detail.sets) {
    const sets = workoutLogs[log.exercise_id];
    // Exercise removed from the routine after the session started
    if (!sets) continue;

    // Sets added during the workout beyond the routine target
    while (sets.length < log.set_number) {
      sets.push({
        setNumber: sets.length + 1,
        weight: "",
        reps: String(targetReps.get(log.exercise_id) ?? 1),
        rir: "",
        completed: false,
      });
    }

    const index = log.set_number - 1;
    sets[index] = {
      ...sets[index],
      weight: String(log.weight),
      reps: String(log.reps),
      rir: log.rir === null ? "" : String(log.rir),
      completed: true,
      backendId: log.id,
    };
  }

  // Resume from the first exercise that still has an unfinished set
  const firstIncomplete = routine.exercises.findIndex((ex) =>
    (workoutLogs[ex.exercise_id] ?? []).some((set) => !set.completed),
  );

  const startedAt = new Date(detail.started_at).getTime();

  return {
    sessionId: detail.id,
    routineId: routine.id,
    routineName: routine.name,
    currentExerciseIndex: firstIncomplete >= 0 ? firstIncomplete : 0,
    startedAtTimestamp: Number.isFinite(startedAt) ? startedAt : Date.now(),
    pausedAtTimestamp: null,
    accumulatedPauseMs: 0,
    isPaused: false,
    workoutLogs,
  };
}

/**
 * Adopt the session still marked `ongoing`/`paused` on the server.
 * Returns null when there is nothing to resume.
 */
export async function resumeOngoingWorkout(
  routine: RoutineRead,
): Promise<ActiveWorkoutSession | null> {
  try {
    const sessions = await getSessions({ limit: 100 });
    const ongoing = sessions.find((s) => s.status !== "completed");
    if (!ongoing?.routine_id) return null;

    const sessionRoutine =
      ongoing.routine_id === routine.id
        ? routine
        : await getRoutine(ongoing.routine_id);

    const detail = await getSessionDetails(ongoing.id);
    const resumed = buildSessionFromServer(sessionRoutine, detail);
    setActiveWorkout(resumed);
    return resumed;
  } catch (err) {
    console.error("Failed to resume the ongoing session:", err);
    return null;
  }
}

export async function initOrResumeWorkout(
  routine: RoutineRead,
): Promise<ActiveWorkoutSession | null> {
  // A local session always wins: the caller redirects to its routine.
  const activeSession = getActiveWorkout();
  if (activeSession) return activeSession;

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
    started_at: new Date(now).toISOString(),
  })
    .then((sessionRes) => {
      setSessionBackendId(sessionRes.id);
      return sessionRes.id;
    })
    .catch(async (err) => {
      // Another ongoing session appeared meanwhile: adopt it.
      if (err instanceof ApiError && err.status === 409) {
        const adopted = await resumeOngoingWorkout(routine);
        return adopted?.sessionId ?? null;
      }
      console.error("Failed to create session on server:", err);
      return null;
    })
    .finally(() => {
      sessionCreationPromise = null;
    });

  await sessionCreationPromise;
  return getActiveWorkout();
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

  updateLocalSetLog(exerciseId, setIndex, { ...changes, touched: true });

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

export async function removeSetFromExercise(
  exerciseId: string,
  setIndex: number,
): Promise<boolean> {
  const session = getActiveWorkout();
  if (!session) return false;

  const sets = session.workoutLogs[exerciseId] ?? [];
  const currentSet = sets[setIndex];
  if (!currentSet) return false;

  // Only the last set can be removed: deleting a middle set would leave a gap
  // in set_number on the server (and on the "last session" comparison).
  if (setIndex !== sets.length - 1) return false;
  // Always keep at least one set per exercise.
  if (sets.length <= 1) return false;

  if (currentSet.backendId) {
    const sessionId = await ensureSessionId();
    if (!sessionId) return false;

    try {
      await deleteSetLogApi(sessionId, currentSet.backendId);
    } catch (err) {
      // Keep the local set if the server deletion failed: no orphan logs.
      console.error("Failed to delete set log:", err);
      return false;
    }
  }

  removeLocalSetFromExercise(exerciseId, setIndex);
  return true;
}

export async function finishWorkoutSession() {
  const sessionId = await ensureSessionId();
  if (sessionId) {
    try {
      const updated = await updateSession(sessionId, {
        status: "completed",
        ended_at: new Date().toISOString(),
      });

      // Hide the "Resume" CTA immediately, before the refetch completes
      queryClient.setQueryData<SessionRead[]>(["sessions"], (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)),
      );

      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      console.error("Failed to complete session on server:", err);
    }
  }

  clearActiveWorkout();
}
