import { randomUUID } from "expo-crypto";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { OfflineWorkoutStorage, QueuedWorkout } from "./offlineWorkoutTypes";

let database: Promise<SQLiteDatabase> | undefined;

function openDatabase() {
  database ??= openDatabaseAsync("zerobuff-workouts.db")
    .then(async (db) => {
      try {
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS workouts (
            account TEXT NOT NULL,
            id TEXT NOT NULL,
            state TEXT NOT NULL CHECK (state IN ('active', 'queued')),
            snapshot TEXT NOT NULL,
            error TEXT,
            PRIMARY KEY (account, id)
          );
          CREATE UNIQUE INDEX IF NOT EXISTS one_active_workout
            ON workouts (account) WHERE state = 'active';
          CREATE TABLE IF NOT EXISTS workout_cache (
            account TEXT NOT NULL,
            key TEXT NOT NULL,
            snapshot TEXT NOT NULL,
            PRIMARY KEY (account, key)
          );
        `);
        return db;
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })
    .catch((error: unknown) => {
      database = undefined;
      throw error;
    });
  return database;
}

async function readCache<T>(account: string, key: string): Promise<T | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ snapshot: string }>(
    "SELECT snapshot FROM workout_cache WHERE account = ? AND key = ?",
    account, key,
  );
  return row ? JSON.parse(row.snapshot) as T : null;
}

async function saveCache(account: string, key: string, value: unknown) {
  const db = await openDatabase();
  await db.runAsync(
    "INSERT INTO workout_cache VALUES (?, ?, ?) ON CONFLICT (account, key) DO UPDATE SET snapshot = excluded.snapshot",
    account, key, JSON.stringify(value),
  );
}

export const offlineWorkoutStorage: OfflineWorkoutStorage = {
  createId: randomUUID,

  async readDraft(account) {
    const db = await openDatabase();
    const row = await db.getFirstAsync<{ snapshot: string }>(
      "SELECT snapshot FROM workouts WHERE account = ? AND state = 'active'", account,
    );
    return row ? JSON.parse(row.snapshot) : null;
  },

  async saveDraft(account, draft) {
    const db = await openDatabase();
    await db.runAsync(
      `INSERT INTO workouts (account, id, state, snapshot) VALUES (?, ?, 'active', ?)
       ON CONFLICT (account, id) DO UPDATE SET snapshot = excluded.snapshot WHERE workouts.state = 'active'`,
      account, draft.localId!, JSON.stringify(draft),
    );
  },

  async discardDraft(account, id) {
    const db = await openDatabase();
    await db.runAsync("DELETE FROM workouts WHERE account = ? AND id = ? AND state = 'active'", account, id);
  },

  async finish(account, workout) {
    const db = await openDatabase();
    // A single UPDATE commits the immutable payload and removes the active state together.
    const result = await db.runAsync(
      "UPDATE workouts SET state = 'queued', snapshot = ? WHERE account = ? AND id = ? AND state = 'active'",
      JSON.stringify(workout), account, workout.payload.id,
    );
    if (result.changes !== 1) throw new Error("Your workout couldn’t be saved. Please try again.");
  },

  async list(account) {
    const db = await openDatabase();
    const rows = await db.getAllAsync<{ snapshot: string; error: string | null }>(
      "SELECT snapshot, error FROM workouts WHERE account = ? AND state = 'queued' ORDER BY rowid", account,
    );
    return rows.map((row) => ({ ...JSON.parse(row.snapshot) as QueuedWorkout, error: row.error }));
  },

  async block(account, id, error) {
    const db = await openDatabase();
    await db.runAsync("UPDATE workouts SET error = ? WHERE account = ? AND id = ? AND state = 'queued'", error, account, id);
  },

  async remove(account, id) {
    const db = await openDatabase();
    await db.runAsync("DELETE FROM workouts WHERE account = ? AND id = ? AND state = 'queued'", account, id);
  },

  readRoutine: (account, id) => readCache(account, `routine:${id}`),
  saveRoutine: (account, routine) => saveCache(account, `routine:${routine.id}`, routine),
  async removeRoutine(account, id) {
    const db = await openDatabase();
    await db.runAsync("DELETE FROM workout_cache WHERE account = ? AND key = ?", account, `routine:${id}`);
  },
  readSchedule: (account) => readCache(account, "schedule"),
  saveSchedule: (account, schedule) => saveCache(account, "schedule", schedule),
};
