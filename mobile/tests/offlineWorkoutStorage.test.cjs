const assert = require("node:assert/strict");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const code = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../src/features/workout/storage/offlineWorkoutStorage.native.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function storageAt(filename) {
  const db = new DatabaseSync(filename);
  const module = { exports: {} };
  const dependencies = {
    "expo-crypto": { randomUUID },
    "expo-sqlite": {
      openDatabaseAsync: async () => ({
        execAsync: async (sql) => db.exec(sql),
        runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
        getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params),
        getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
        closeAsync: async () => db.close(),
      }),
    },
  };
  new Function("module", "exports", "require", code)(module, module.exports, (id) => dependencies[id]);
  return { storage: module.exports.offlineWorkoutStorage, db };
}

test("Finish atomically changes the draft to a queue row and preserves it through restart", async (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "zerobuff-sqlite-"));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const filename = path.join(folder, "workouts.db");
  const { storage, db } = storageAt(filename);
  const id = storage.createId();
  const draft = { localId: id, routineId: "test", workoutLogs: {} };
  const queued = { payload: { id, sets: [] }, summary: {}, routine: {}, error: null };
  await storage.saveDraft("first", draft);
  await assert.rejects(storage.saveDraft("first", { ...draft, localId: storage.createId() }));

  db.exec(`CREATE TRIGGER fail_finish BEFORE UPDATE OF state ON workouts
           BEGIN SELECT RAISE(ABORT, 'disk write failed'); END;`);
  await assert.rejects(storage.finish("first", queued), /disk write failed/);
  assert.deepEqual(await storage.readDraft("first"), draft);
  assert.deepEqual(await storage.list("first"), []);
  db.exec("DROP TRIGGER fail_finish");

  await storage.finish("first", queued);
  await storage.saveDraft("first", draft); // An obsolete write cannot revive a queued row.
  db.close();

  const restored = storageAt(filename);
  assert.equal(await restored.storage.readDraft("first"), null);
  assert.deepEqual(await restored.storage.list("first"), [queued]);
  assert.deepEqual(await restored.storage.list("second"), []);
  await restored.storage.remove("second", id);
  assert.deepEqual(await restored.storage.list("first"), [queued]);
  await restored.storage.remove("first", id);
  assert.deepEqual(await restored.storage.list("first"), []);
  restored.db.close();
});

test("downloads and failed uploads remain isolated by account", async () => {
  const { storage, db } = storageAt(":memory:");
  const routine = { id: "r", name: "Work", exercises: [] };
  await storage.saveRoutine("first", routine);
  await storage.saveSchedule("first", [{ routine_id: routine.id, day_of_week: "monday" }]);
  assert.deepEqual(await storage.readRoutine("first", routine.id), routine);
  assert.equal((await storage.readSchedule("first"))[0].day_of_week, "monday");
  assert.equal(await storage.readRoutine("second", routine.id), null);
  assert.equal(await storage.readSchedule("second"), null);

  const id = storage.createId();
  await storage.saveDraft("first", { localId: id });
  await storage.finish("first", { payload: { id }, error: null });
  await storage.block("first", id, "Exercise unavailable");
  assert.equal((await storage.list("first"))[0].error, "Exercise unavailable");
  db.close();
});
