export type NativeRestTimer = {
  id: string;
  workoutKey: string;
  routineId: string;
  title: string;
  endAt: number;
  version: number;
  status: "active" | "complete" | "skipped";
  surfaceDismissed?: boolean;
};

export type RestTimerSnapshot = {
  workoutKey: string;
  routineId: string;
  title: string;
  id: string | null;
  endAt: number | null;
};

export interface RestTimerAdapter {
  getState(): Promise<string | null>;
  setTimer(json: string, expectedVersion: number): Promise<string>;
  clear(): Promise<void>;
  authorize(): Promise<void>;
}

export function parseNativeTimer(json: string | null): NativeRestTimer | null {
  if (!json) return null;
  let state: NativeRestTimer;
  try {
    state = JSON.parse(json) as NativeRestTimer;
  } catch {
    return null;
  }
  if (
    !state ||
    typeof state.id !== "string" ||
    typeof state.workoutKey !== "string" ||
    typeof state.routineId !== "string" ||
    typeof state.title !== "string" ||
    !Number.isFinite(state.endAt) ||
    !Number.isInteger(state.version) ||
    !["active", "complete", "skipped"].includes(state.status)
  )
    return null;
  return state;
}

export function timerSnapshot(state: NativeRestTimer): RestTimerSnapshot {
  return {
    workoutKey: state.workoutKey,
    routineId: state.routineId,
    title: state.title,
    id: state.id,
    endAt: state.status === "skipped" ? null : state.endAt,
  };
}

// All writes are serialized; an obsolete start can never race a later skip/finish.
// No scheduler or polling: called on edits, native actions and foreground transitions only.
export class RestTimerSync {
  private desired: RestTimerSnapshot | null = null;
  private generation = 0;
  private tail: Promise<void> = Promise.resolve();
  private versions = new Map<string, number>();
  private initialized = false;

  constructor(
    private adapter: RestTimerAdapter,
    private apply: (state: NativeRestTimer) => void,
    private failed: (error: unknown) => void,
  ) {}

  private enqueue(operation: () => Promise<void>): Promise<void> {
    this.tail = this.tail.then(operation).catch((error: unknown) => {
      this.failed(error);
    });
    return this.tail;
  }

  update(snapshot: RestTimerSnapshot | null): Promise<void> {
    return this.synchronize(snapshot, false);
  }

  private synchronize(
    snapshot: RestTimerSnapshot | null,
    republish: boolean,
  ): Promise<void> {
    if (
      !republish &&
      this.initialized &&
      JSON.stringify(this.desired) === JSON.stringify(snapshot)
    )
      return this.tail;
    this.initialized = true;
    this.desired = snapshot;
    const generation = ++this.generation;
    return this.enqueue(async () => {
      if (generation !== this.generation) return;
      if (!snapshot) {
        await this.adapter.clear();
        this.versions.clear();
        return;
      }
      const current = parseNativeTimer(await this.adapter.getState());
      if (generation !== this.generation) return;
      if (
        current?.workoutKey === snapshot.workoutKey &&
        (snapshot.id === null || snapshot.id === current.id) &&
        (republish ||
          !this.versions.has(current.id) ||
          current.version > this.versions.get(current.id)!)
      ) {
        this.accept(current);
        // A saved timer does not prove that its notifications were published.
        // Retry active timers using the latest native deadline, never revive a
        // completed/skipped timer or remove its completion alert.
        if (!republish || current.status !== "active") return;
        snapshot = timerSnapshot(current);
      }
      if (!snapshot.id || snapshot.endAt === null) {
        await this.adapter.clear();
        return;
      }
      await this.adapter.authorize();
      if (generation !== this.generation) return;
      const expected = current?.id === snapshot.id ? current.version : 0;
      const result = parseNativeTimer(
        await this.adapter.setTimer(
          JSON.stringify({
            ...snapshot,
            endAt: snapshot.endAt,
            version: expected,
            status: "active",
          }),
          expected,
        ),
      );
      if (result && generation === this.generation) this.accept(result);
    });
  }

  refresh(): Promise<void> {
    const generation = this.generation;
    return this.enqueue(async () => {
      const state = parseNativeTimer(await this.adapter.getState());
      const desired = this.desired;
      if (
        generation === this.generation &&
        state &&
        desired &&
        state.workoutKey === desired.workoutKey &&
        (!desired.id || state.id === desired.id)
      ) {
        this.accept(state);
      }
    });
  }

  private accept(state: NativeRestTimer) {
    this.versions.clear();
    this.versions.set(state.id, state.version);
    this.desired = timerSnapshot(state);
    this.apply(state);
  }

  // Allows a failed native operation to be retried on the next foreground event.
  retry(): Promise<void> {
    return this.synchronize(this.desired, true);
  }
}
