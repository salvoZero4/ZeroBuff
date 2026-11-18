import { tokenStore } from "@/features/auth/store/tokenStore";
import type { RoutineRead } from "@/features/routines/types/routine";
import type { ScheduleRead } from "@/features/schedule/types/schedule";
import { offlineWorkoutStorage } from "./offlineWorkoutStorage";

const revisions = new Map<string, number>();
let cacheWrites = Promise.resolve();

export function refreshWorkoutCache<T>(
  key: string,
  fetch: () => Promise<T>,
  save: (account: string, value: T) => Promise<void>,
): Promise<T> {
  const account = tokenStore.getAccountId();
  const scope = tokenStore.getSessionScope();
  const revisionKey = `${account}:${key}`;
  const revision = revisions.get(revisionKey);
  return fetch().then(async (value) => {
    if (account && scope === tokenStore.getSessionScope() && revision === revisions.get(revisionKey)) {
      await queueCacheWrite(() => save(account, value));
    }
    return value;
  });
}

function queueCacheWrite(write: () => Promise<void>) {
  const pending = cacheWrites.then(write);
  cacheWrites = pending.catch(() => {});
  // Network reads and confirmed server mutations remain usable on disk failure.
  return cacheWrites;
}

function markChanged(account: string, key: string) {
  const revision = `${account}:${key}`;
  revisions.set(revision, (revisions.get(revision) ?? 0) + 1);
}

export const cacheRoutine = (account: string, routine: RoutineRead) =>
  offlineWorkoutStorage?.saveRoutine(account, routine) ?? Promise.resolve();

export const cacheSchedule = (account: string, schedule: ScheduleRead[]) =>
  offlineWorkoutStorage?.saveSchedule(account, schedule) ?? Promise.resolve();

export async function confirmRoutineForOffline(account: string | null, routine: RoutineRead) {
  if (!account || !offlineWorkoutStorage) return;
  markChanged(account, routine.id);
  await queueCacheWrite(() => cacheRoutine(account, routine));
}

export async function removeRoutineFromOffline(account: string | null, id: string) {
  if (!account || !offlineWorkoutStorage) return;
  const storage = offlineWorkoutStorage;
  markChanged(account, id);
  markChanged(account, "schedule");
  await queueCacheWrite(async () => {
    await storage.removeRoutine(account, id);
    const schedule = await storage.readSchedule(account);
    if (schedule) await storage.saveSchedule(account, schedule.filter((item) => item.routine_id !== id));
  });
}

export async function confirmScheduleForOffline(
  account: string | null,
  day: ScheduleRead["day_of_week"],
  entry: ScheduleRead | null,
) {
  if (!account || !offlineWorkoutStorage) return;
  const storage = offlineWorkoutStorage;
  markChanged(account, "schedule");
  await queueCacheWrite(async () => {
    const schedule = await storage.readSchedule(account);
    if (schedule) {
      await storage.saveSchedule(account, [
        ...schedule.filter((item) => item.day_of_week !== day),
        ...(entry ? [entry] : []),
      ]);
    }
  });
}
