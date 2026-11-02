import type {
  ActiveSetLog,
  ActiveWorkoutSession,
} from "@/features/workout/store/activeWorkoutStore";

export const WEIGHT_UNIT = "kg";

export function adjustNumericInput(
  input: string,
  amount: number,
  minimum: number,
): string {
  const value = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(value)) return input;
  return String(Math.max(minimum, Math.round((value + amount) * 100) / 100));
}

export type WorkoutSummary = {
  routineName: string;
  durationSeconds: number;
  exercises: number;
  sets: number;
  volume: number;
  improvedExercises: number;
  comparedExercises: number;
};

type PreviousSets = Record<string, { weight: number; reps: number }[]>;

export function summarizeWorkout(
  session: ActiveWorkoutSession,
  durationSeconds: number,
  previous: PreviousSets = {},
): WorkoutSummary {
  let sets = 0,
    exercises = 0,
    volume = 0,
    improvedExercises = 0,
    comparedExercises = 0;
  for (const [id, logs] of Object.entries(session.workoutLogs)) {
    const saved = logs.filter(
      (set) =>
        set.completed &&
        set.backendId &&
        !set.backendId.startsWith("tmp-") &&
        (!set.saveStatus || set.saveStatus === "saved"),
    );
    if (!saved.length) continue;
    exercises++;
    sets += saved.length;
    const current = saved.map((set) => ({
      weight: Number(set.weight.replace(",", ".")),
      reps: Number(set.reps),
    }));
    const currentVolume = current.reduce(
      (total, set) => total + set.weight * set.reps,
      0,
    );
    volume += currentVolume;
    const earlier = previous[id];
    if (!earlier?.length) continue;
    comparedExercises++;
    const bodyweight = [...current, ...earlier].every(
      (set) => set.weight === 0,
    );
    const best = (values: { weight: number; reps: number }[]) =>
      Math.max(
        ...values.map((set) => (bodyweight ? set.reps : set.weight * set.reps)),
      );
    if (best(current) > best(earlier)) improvedExercises++;
  }
  return {
    routineName: session.routineName,
    durationSeconds,
    exercises,
    sets,
    volume,
    improvedExercises,
    comparedExercises,
  };
}

export function isSetSaved(set: ActiveSetLog): boolean {
  return Boolean(
    set.completed &&
    set.backendId &&
    !set.backendId.startsWith("tmp-") &&
    (!set.saveStatus || set.saveStatus === "saved"),
  );
}

export function nextIncompleteSet(sets: ActiveSetLog[], after: number): number {
  const indices = sets.map((_, index) => index);
  return (
    [...indices.slice(after + 1), ...indices.slice(0, after)].find(
      (index) => !isSetSaved(sets[index]),
    ) ?? -1
  );
}

export function nextSetAfterSave(
  before: ActiveWorkoutSession | null,
  after: ActiveWorkoutSession | null,
  exerciseId: string,
  setIndex: number,
  interactionChanged: boolean,
): number {
  if (
    !before ||
    !after ||
    interactionChanged ||
    before.startedAtTimestamp !== after.startedAtTimestamp ||
    before.currentExerciseIndex !== after.currentExerciseIndex
  )
    return -1;
  const original = before.workoutLogs[exerciseId]?.[setIndex];
  const sets = after.workoutLogs[exerciseId] ?? [];
  if (
    !original ||
    original.completed ||
    !sets[setIndex] ||
    !isSetSaved(sets[setIndex])
  )
    return -1;
  return nextIncompleteSet(sets, setIndex);
}
