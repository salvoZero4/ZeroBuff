import type {
  ActiveSetLog,
  ActiveWorkoutSession,
} from "../types/activeWorkout";
import { tokenStore } from "@/features/auth/store/tokenStore";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import { getRoutine } from "@/features/routines/api/routines";
import type { RoutineRead } from "@/features/routines/types/routine";
import { queryClient } from "@/shared/api/queryClient";
import { ApiError, NetworkError } from "@/shared/api/errors";
import {
  createSession,
  createSetLogApi,
  deleteSetLogApi,
  getSessionDetails,
  getSessions,
  updateSession,
  updateSetLogApi,
} from "@/features/workout/api/session";
import type {
  SessionDetailRead,
  SessionRead,
} from "@/features/workout/types/session";
import {
  clearActiveWorkout,
  getActiveWorkout,
  restoreActiveWorkout,
  removeLocalSetFromExercise,
  setActiveWorkout,
  setSessionBackendId,
  updateLocalSetLog,
  setWorkoutFinishing,
  setWorkoutRestEndTimestamp,
} from "@/features/workout/store/activeWorkoutStore";

/**
 * Normalizza e valida gli input utente trasformandoli
 * nei valori numerici per il backend.
 */
export function parseSetInputValues(
  weightStr: string,
  repsStr: string,
  rirStr: string,
) {
  const weightNum = Number(weightStr.trim().replace(",", "."));
  const repsNum = Number(repsStr.trim());
  const rirNum = rirStr.trim() === "" ? null : Number(rirStr.trim());
  if (!weightStr.trim() || !Number.isFinite(weightNum) || weightNum < 0) {
    throw new Error("Enter a weight of 0 kg or more.");
  }
  if (!repsStr.trim() || !Number.isInteger(repsNum) || repsNum <= 0) {
    throw new Error("Enter a whole number of reps greater than 0.");
  }
  if (
    rirNum !== null &&
    (!Number.isInteger(rirNum) || rirNum < 0 || rirNum > 10)
  ) {
    throw new Error("RIR must be a whole number from 0 to 10.");
  }
  return { weightNum, repsNum, rirNum };
}

export function workoutErrorMessage(error: unknown): string {
  if (error instanceof NetworkError)
    return "Connection lost. Check your connection and retry.";
  if (error instanceof ApiError) {
    if (error.status === 429)
      return "Too many requests. Try again in a minute.";
    if (error.status === 403) return "Not allowed to change this workout.";
    if (error.status === 404)
      return "This workout or set is no longer available.";
    if (error.status >= 500) return "The server is unavailable. Please retry.";
  }
  return error instanceof Error
    ? error.message
    : "Could not save. Please retry.";
}

function invalidateWorkout(sessionId: string | null, exerciseId?: string) {
  void queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
  if (sessionId)
    void queryClient.invalidateQueries({
      queryKey: sessionKeys.detail(sessionId),
    });
  if (exerciseId)
    void queryClient.invalidateQueries({
      queryKey: exerciseKeys.stats(exerciseId),
    });
}

let sessionCreationPromise: Promise<string | null> | null = null;
let sessionCreationKey: string | null = null;
const creationKey = (session: ActiveWorkoutSession) =>
  `${tokenStore.getSessionScope()}:${session.routineId}:${session.startedAtTimestamp}`;

async function ensureSessionId(): Promise<string | null> {
  const session = getActiveWorkout();
  if (session?.sessionId) return session.sessionId;
  if (!session) return null;
  const key = creationKey(session);
  if (sessionCreationPromise && sessionCreationKey === key)
    return await sessionCreationPromise;
  sessionCreationKey = key;
  const promise = createSession({
    routine_id: session.routineId,
    started_at: new Date(session.startedAtTimestamp).toISOString(),
  })
    .then((created) => {
      if (getActiveWorkout() && creationKey(getActiveWorkout()!) === key)
        setSessionBackendId(created.id);
      return created.id;
    })
    .catch(async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        const ongoing = (await getSessions({ limit: 100 })).find(
          (s) => s.status !== "completed",
        );
        if (ongoing?.routine_id === session.routineId) {
          if (getActiveWorkout() && creationKey(getActiveWorkout()!) === key)
            setSessionBackendId(ongoing.id);
          return ongoing.id;
        }
      }
      throw error;
    })
    .finally(() => {
      if (sessionCreationPromise === promise) sessionCreationPromise = null;
    });
  sessionCreationPromise = promise;
  return promise;
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
  const scope = tokenStore.getSessionScope();
  const previous = getActiveWorkout();
  try {
    const sessions = await getSessions({ limit: 100 });
    const ongoing = sessions.find((s) => s.status !== "completed");
    if (!ongoing?.routine_id) return null;

    const sessionRoutine =
      ongoing.routine_id === routine.id
        ? routine
        : await getRoutine(ongoing.routine_id);

    const detail = await getSessionDetails(ongoing.id);
    if (
      tokenStore.getSessionScope() !== scope ||
      getActiveWorkout() !== previous
    )
      return getActiveWorkout();
    if (detail.status === "completed") return null;
    const resumed = buildSessionFromServer(sessionRoutine, detail);
    setActiveWorkout(resumed);
    return resumed;
  } catch (err) {
    console.error("Failed to resume the ongoing session:", err);
    return null;
  }
}

let initialization: {
  scope: string | null;
  promise: Promise<ActiveWorkoutSession | null>;
} | null = null;

export async function initOrResumeWorkout(
  routine: RoutineRead,
): Promise<ActiveWorkoutSession | null> {
  const scope = tokenStore.getSessionScope();
  if (initialization?.scope === scope) return initialization.promise;
  const promise = initializeWorkout(routine, scope).finally(() => {
    if (initialization?.promise === promise) initialization = null;
  });
  initialization = { scope, promise };
  return promise;
}

async function initializeWorkout(
  routine: RoutineRead,
  scope: string | null,
): Promise<ActiveWorkoutSession | null> {
  await restoreActiveWorkout();
  if (tokenStore.getSessionScope() !== scope) return null;
  // A local session always wins: the caller redirects to its routine.
  const activeSession = getActiveWorkout();
  if (activeSession) return activeSession;

  const resumed = await resumeOngoingWorkout(routine);
  if (tokenStore.getSessionScope() !== scope) return null;
  if (resumed) return resumed;
  // Another caller or hydration may have installed a session during the request.
  if (getActiveWorkout()) return getActiveWorkout();

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

  sessionCreationKey = creationKey(getActiveWorkout()!);
  const key = sessionCreationKey;
  const promise = createSession({
    routine_id: routine.id,
    started_at: new Date(now).toISOString(),
  })
    .then((sessionRes) => {
      if (getActiveWorkout() && creationKey(getActiveWorkout()!) === key)
        setSessionBackendId(sessionRes.id);
      return sessionRes.id;
    })
    .catch(async (err) => {
      // Another ongoing session appeared meanwhile: adopt it.
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        tokenStore.getSessionScope() === scope &&
        getActiveWorkout()?.startedAtTimestamp === now
      ) {
        const adopted = await resumeOngoingWorkout(routine);
        return adopted?.sessionId ?? null;
      }
      console.error("Failed to create session on server:", err);
      return null;
    })
    .finally(() => {
      if (sessionCreationPromise === promise) sessionCreationPromise = null;
    });

  sessionCreationPromise = promise;
  await promise;
  if (tokenStore.getSessionScope() !== scope) return null;
  return getActiveWorkout();
}

/** Serialize each row, keep failed drafts, and reconcile uncertain writes before retrying. */
async function saveSet(exerciseId: string, setIndex: number, deleting = false) {
  const session = getActiveWorkout();
  const before = session?.workoutLogs[exerciseId]?.[setIndex];
  if (
    !session ||
    !before ||
    session.isFinishing ||
    before.saveStatus === "pending"
  )
    return;
  const key = creationKey(session);
  const sameSession = () => {
    const current = getActiveWorkout();
    return current !== null && creationKey(current) === key;
  };
  const patch = (changes: Partial<ActiveSetLog>) => {
    if (sameSession()) updateLocalSetLog(exerciseId, setIndex, changes);
  };
  let sessionId = session.sessionId;
  let backendId = before.backendId?.startsWith("tmp-")
    ? undefined
    : before.backendId;
  let writeAttempted = false;
  patch({
    saveStatus: "pending",
    saveError: undefined,
    touched: true,
    retryAction: deleting ? "delete" : "save",
  });
  try {
    const values = deleting
      ? null
      : parseSetInputValues(before.weight, before.reps, before.rir);
    sessionId = await ensureSessionId();
    if (!sessionId || !sameSession())
      throw new Error("Workout is not connected to the server. Please retry.");
    // The server may have committed a previous request whose response was lost.
    if (before.needsReconcile || !backendId) {
      const detail = await getSessionDetails(sessionId);
      const existing = detail.sets.find(
        (set) =>
          set.exercise_id === exerciseId && set.set_number === before.setNumber,
      );
      backendId = existing?.id;
    }
    if (!sameSession()) return;
    if (deleting) {
      if (backendId) {
        writeAttempted = true;
        await deleteSetLogApi(sessionId, backendId);
      }
      patch({
        backendId: undefined,
        completed: false,
        saveStatus: undefined,
        retryAction: undefined,
        needsReconcile: false,
      });
    } else {
      const payload = {
        weight: values!.weightNum,
        reps: values!.repsNum,
        rir: values!.rirNum,
      };
      const temporaryId =
        "tmp-" +
        "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const n = Math.floor(Math.random() * 16);
          return (c === "x" ? n : (n & 3) | 8).toString(16);
        });
      patch({ completed: true, backendId: backendId ?? temporaryId });
      writeAttempted = true;
      const saved = backendId
        ? await updateSetLogApi(sessionId, backendId, payload)
        : await createSetLogApi(sessionId, exerciseId, {
            ...payload,
            set_number: before.setNumber,
          });
      patch({
        backendId: saved.id,
        completed: true,
        saveStatus: "saved",
        retryAction: undefined,
        needsReconcile: false,
      });
    }
  } catch (error) {
    patch({
      backendId,
      completed: before.completed,
      saveStatus: "error",
      saveError: workoutErrorMessage(error),
      retryAction: deleting ? "delete" : "save",
      needsReconcile: before.needsReconcile || writeAttempted,
    });
  } finally {
    invalidateWorkout(sessionId, exerciseId);
  }
}

export async function logSetCompleted(
  exerciseId: string,
  setIndex: number,
  restSeconds = 90,
) {
  const original = getActiveWorkout();
  const before = original?.workoutLogs[exerciseId]?.[setIndex];
  if (
    !original ||
    !before ||
    before.saveStatus === "pending" ||
    before.completed
  )
    return;
  await saveSet(exerciseId, setIndex);
  const session = getActiveWorkout();
  const saved = session?.workoutLogs[exerciseId]?.[setIndex];
  if (
    session?.startedAtTimestamp === original.startedAtTimestamp &&
    saved?.saveStatus === "saved" &&
    (session.autoRestEnabled ?? true) &&
    restSeconds > 0
  ) {
    setWorkoutRestEndTimestamp(Date.now() + restSeconds * 1000);
  }
}

export async function retrySetLog(exerciseId: string, setIndex: number) {
  const set = getActiveWorkout()?.workoutLogs[exerciseId]?.[setIndex];
  if (set?.retryAction === "remove") {
    const original = getActiveWorkout();
    const key = original ? creationKey(original) : null;
    try {
      await removeSetFromExercise(exerciseId, setIndex);
    } catch (error) {
      if (!getActiveWorkout() || creationKey(getActiveWorkout()!) !== key)
        return;
      updateLocalSetLog(exerciseId, setIndex, {
        saveStatus: "error",
        saveError: workoutErrorMessage(error),
      });
    }
    return;
  }
  return saveSet(exerciseId, setIndex, set?.retryAction === "delete");
}

export async function updateOrDeleteSetLog(
  exerciseId: string,
  setIndex: number,
  changes: Partial<ActiveSetLog>,
) {
  const set = getActiveWorkout()?.workoutLogs[exerciseId]?.[setIndex];
  if (!set) return;
  if (changes.completed === false) return saveSet(exerciseId, setIndex, true);
  if (set.saveStatus === "dirty") return saveSet(exerciseId, setIndex);
}

export async function removeSetFromExercise(
  exerciseId: string,
  setIndex: number,
): Promise<boolean> {
  const session = getActiveWorkout();
  const sets = session?.workoutLogs[exerciseId] ?? [];
  const set = sets[setIndex];
  if (
    !session ||
    session.isFinishing ||
    !set ||
    set.saveStatus === "pending" ||
    setIndex !== sets.length - 1 ||
    sets.length <= 1
  )
    return false;
  const key = creationKey(session);
  if (set.backendId || set.needsReconcile) {
    updateLocalSetLog(exerciseId, setIndex, {
      saveStatus: "pending",
      retryAction: "remove",
    });
    try {
      const sessionId = session.sessionId ?? (await ensureSessionId());
      if (!sessionId)
        throw new Error("Workout is not connected to the server.");
      let backendId = set.backendId;
      if (set.needsReconcile) {
        const detail = await getSessionDetails(sessionId);
        backendId = detail.sets.find(
          (log) =>
            log.exercise_id === exerciseId && log.set_number === set.setNumber,
        )?.id;
      }
      if (!getActiveWorkout() || creationKey(getActiveWorkout()!) !== key)
        return false;
      if (backendId) {
        try {
          await deleteSetLogApi(sessionId, backendId);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      }
    } catch (error) {
      if (getActiveWorkout() && creationKey(getActiveWorkout()!) === key)
        updateLocalSetLog(exerciseId, setIndex, {
          ...set,
          saveStatus: set.saveStatus,
        });
      throw error;
    } finally {
      invalidateWorkout(session.sessionId, exerciseId);
    }
  }
  if (!getActiveWorkout() || creationKey(getActiveWorkout()!) !== key)
    return false;
  removeLocalSetFromExercise(exerciseId, setIndex);
  return true;
}

export async function finishWorkoutSession(
  onConfirmed?: (sessionId: string) => void,
): Promise<boolean> {
  const session = getActiveWorkout();
  if (!session || session.isFinishing) return false;
  const sets = Object.values(session.workoutLogs).flat();
  if (sets.some((set) => set.saveStatus === "pending"))
    throw new Error("Wait for your sets to finish saving.");
  if (
    sets.some(
      (set) =>
        set.saveStatus === "error" ||
        set.saveStatus === "dirty" ||
        set.needsReconcile,
    )
  ) {
    throw new Error(
      "Save or retry the highlighted sets before finishing your workout.",
    );
  }
  setWorkoutFinishing(true);
  const key = creationKey(session);
  let sessionId = session.sessionId;
  try {
    sessionId = await ensureSessionId();
    if (!sessionId)
      throw new Error("Workout is not connected to the server. Please retry.");
    if (!getActiveWorkout() || creationKey(getActiveWorkout()!) !== key)
      return false;
    // Makes a retry safe when the previous finish succeeded but its response was lost.
    const detail = await getSessionDetails(sessionId);
    if (!getActiveWorkout() || creationKey(getActiveWorkout()!) !== key)
      return false;
    const updated =
      detail.status === "completed"
        ? detail
        : await updateSession(sessionId, {
            status: "completed",
            ended_at: new Date().toISOString(),
          });
    queryClient.setQueriesData<SessionRead[]>(
      { queryKey: sessionKeys.lists() },
      (old) => old?.map((s) => (s.id === updated.id ? updated : s)),
    );
    if (!getActiveWorkout() || creationKey(getActiveWorkout()!) !== key)
      return false;
    clearActiveWorkout();
    onConfirmed?.(sessionId);
    return true;
  } finally {
    if (getActiveWorkout() && creationKey(getActiveWorkout()!) === key)
      setWorkoutFinishing(false);
    invalidateWorkout(sessionId);
  }
}
