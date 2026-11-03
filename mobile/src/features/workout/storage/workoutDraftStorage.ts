import type {
  ActiveSetLog,
  ActiveWorkoutSession,
} from "../store/activeWorkoutStore";

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const optionalBoolean = (value: unknown) =>
  value === undefined || typeof value === "boolean";
const optionalString = (value: unknown) =>
  value === undefined || typeof value === "string";

function isSet(value: unknown, index: number): value is ActiveSetLog {
  return (
    isRecord(value) &&
    value.setNumber === index + 1 &&
    typeof value.weight === "string" &&
    typeof value.reps === "string" &&
    typeof value.rir === "string" &&
    typeof value.completed === "boolean" &&
    optionalString(value.backendId) &&
    optionalString(value.saveError) &&
    optionalBoolean(value.touched) &&
    optionalBoolean(value.needsReconcile) &&
    (value.saveStatus === undefined ||
      ["pending", "saved", "error", "dirty"].includes(
        String(value.saveStatus),
      )) &&
    (value.retryAction === undefined ||
      ["save", "delete", "remove"].includes(String(value.retryAction)))
  );
}

function isSession(value: unknown): value is ActiveWorkoutSession {
  return (
    isRecord(value) &&
    (value.sessionId === null || typeof value.sessionId === "string") &&
    typeof value.routineId === "string" &&
    value.routineId.length > 0 &&
    typeof value.routineName === "string" &&
    finite(value.currentExerciseIndex) &&
    Number.isInteger(value.currentExerciseIndex) &&
    finite(value.startedAtTimestamp) &&
    finite(value.accumulatedPauseMs) &&
    (value.pausedAtTimestamp === null || finite(value.pausedAtTimestamp)) &&
    typeof value.isPaused === "boolean" &&
    optionalBoolean(value.autoRestEnabled) &&
    optionalBoolean(value.isFinishing) &&
    optionalString(value.restTimerId) &&
    (value.restEndTimestamp === undefined ||
      value.restEndTimestamp === null ||
      finite(value.restEndTimestamp)) &&
    isRecord(value.workoutLogs) &&
    Object.values(value.workoutLogs).every(
      (sets) => Array.isArray(sets) && sets.length > 0 && sets.every(isSet),
    )
  );
}

/** In-flight requests cannot survive the process. Retry always reconciles first. */
export function recoverWorkout(
  session: ActiveWorkoutSession,
): ActiveWorkoutSession {
  return {
    ...session,
    isFinishing: false,
    workoutLogs: Object.fromEntries(
      Object.entries(session.workoutLogs).map(([id, sets]) => [
        id,
        sets.map((set) => {
          const temporary = set.backendId?.startsWith("tmp-");
          if (set.saveStatus !== "pending" && !temporary) return set;
          return {
            ...set,
            backendId: temporary ? undefined : set.backendId,
            completed: temporary ? false : set.completed,
            saveStatus: "error" as const,
            saveError:
              "Saving was interrupted. Retry to check the server and save this set.",
            retryAction: set.retryAction ?? "save",
            needsReconcile: true,
          };
        }),
      ]),
    ),
  };
}

/** Serialized snapshots, not a queue of API writes. Only the latest state is stored. */
export class WorkoutDraftStorage {
  private tail: Promise<void> = Promise.resolve();

  constructor(private storage: Storage) {}

  private key(scope: string) {
    return `zerobuff.activeWorkout.v1.${scope}`;
  }

  write(scope: string, session: ActiveWorkoutSession | null): Promise<void> {
    // Capture now, before any subsequent store edits or account changes.
    const value = session ? JSON.stringify({ version: 1, session }) : null;
    const operation = this.tail.then(() =>
      value === null
        ? this.storage.removeItem(this.key(scope))
        : this.storage.setItem(this.key(scope), value),
    );
    this.tail = operation.catch(() => {});
    return operation;
  }

  async read(scope: string): Promise<ActiveWorkoutSession | null> {
    await this.tail;
    const raw = await this.storage.getItem(this.key(scope));
    if (raw === null) return null;
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      throw new Error("Your saved workout couldn’t be read. Please try again.");
    }
    if (
      !isRecord(snapshot) ||
      snapshot.version !== 1 ||
      !isSession(snapshot.session)
    ) {
      throw new Error(
        "Your saved workout has an unsupported format. Please update the app.",
      );
    }
    return recoverWorkout(snapshot.session);
  }

  flush(): Promise<void> {
    return this.tail;
  }
}
