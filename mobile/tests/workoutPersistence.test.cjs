const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fixture() {
  return {
    sessionId: "session",
    routineId: "routine",
    routineName: "Push",
    currentExerciseIndex: 1,
    startedAtTimestamp: 1000,
    pausedAtTimestamp: 2000,
    accumulatedPauseMs: 300,
    isPaused: true,
    autoRestEnabled: false,
    restTimerId: "rest",
    restEndTimestamp: 6000,
    workoutLogs: {
      exercise: [
        {
          setNumber: 1,
          weight: "20,5",
          reps: "10",
          rir: "2",
          completed: false,
          touched: true,
        },
      ],
    },
  };
}
const routine = {
  id: "routine",
  name: "Push",
  exercises: [{ exercise_id: "exercise", sets: 1, reps: 10 }],
};

// Every runtime has a fresh module cache: only the simulated disk/server survives a kill.
function runtime({
  disk = new Map(),
  scope = "login-a",
  storage = {},
  api = {},
} = {}) {
  const calls = [];
  let owner = scope;
  const storageApi = {
    getItem: async (key) => disk.get(key) ?? null,
    setItem: async (key, value) => {
      disk.set(key, value);
    },
    removeItem: async (key) => {
      disk.delete(key);
    },
    ...storage,
  };
  const endpoints = {
    getSessions: async () => [],
    createSession: async () => ({ id: "new-session" }),
    getSessionDetails: async () => ({
      id: "session",
      status: "ongoing",
      sets: [],
    }),
    createSetLogApi: async () => ({ id: "saved" }),
    updateSetLogApi: async () => ({ id: "saved" }),
    deleteSetLogApi: async () => {},
    updateSession: async () => ({ id: "session", status: "completed" }),
    ...api,
  };
  for (const name of Object.keys(endpoints)) {
    const fn = endpoints[name];
    endpoints[name] = (...args) => {
      calls.push([name, ...args]);
      return fn(...args);
    };
  }
  const stubs = {
    react: { useSyncExternalStore() {} },
    "@react-native-async-storage/async-storage": {
      __esModule: true,
      default: storageApi,
    },
    "@/features/auth/store/tokenStore": {
      tokenStore: { getSessionScope: () => owner },
    },
    "@/features/routines/api/routines": { getRoutine: async () => routine },
    "@/features/workout/api/session": endpoints,
    "@/shared/api/queryClient": {
      queryClient: { invalidateQueries: async () => {}, setQueriesData() {} },
    },
  };
  const modules = {};
  function load(name) {
    if (stubs[name]) return stubs[name];
    if (modules[name]) return modules[name].exports;
    const file = path.join(__dirname, "../src", name.replace("@/", "") + ".ts");
    const mod = { exports: {} };
    modules[name] = mod;
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInThisContext(`(function(require, module, exports) {${code}\n})`, {
      filename: file,
    })(
      (dependency) =>
        load(
          dependency.startsWith(".")
            ? path.posix.join(path.posix.dirname(name), dependency)
            : dependency,
        ),
      mod,
      mod.exports,
    );
    return mod.exports;
  }
  return {
    store: load("@/features/workout/store/activeWorkoutStore"),
    workout: load("@/features/workout/utils/workout"),
    calls,
    disk,
    changeOwner: (value) => {
      owner = value;
    },
  };
}

test("memory-kill restores edited drafts, extra sets, navigation, pause and rest before any server call", async () => {
  const disk = new Map();
  const old = runtime({ disk });
  old.store.setActiveWorkout(fixture());
  old.store.editSetLog("exercise", 0, { weight: "", reps: "12" });
  old.store.addLocalSetToExercise("exercise", 8);
  await old.store.flushWorkoutPersistence();
  const fresh = runtime({ disk });
  const restored = await fresh.workout.initOrResumeWorkout({
    ...routine,
    id: "other-routine",
  });
  assert.deepEqual(
    restored,
    JSON.parse(
      JSON.stringify({ ...old.store.getActiveWorkout(), isFinishing: false }),
    ),
  );
  assert.equal(restored.workoutLogs.exercise[0].weight, "");
  assert.equal(restored.workoutLogs.exercise.length, 2);
  assert.deepEqual(fresh.calls, []);
});

test("a POST committed before a kill is reconciled with GET then PATCH only on explicit retry", async () => {
  const disk = new Map();
  const lostResponse = deferred();
  const old = runtime({
    disk,
    api: { createSetLogApi: () => lostResponse.promise },
  });
  old.store.setActiveWorkout(fixture());
  void old.workout.logSetCompleted("exercise", 0);
  await new Promise(setImmediate);
  await old.store.flushWorkoutPersistence();
  const fresh = runtime({
    disk,
    api: {
      getSessionDetails: async () => ({
        id: "session",
        status: "ongoing",
        sets: [{ id: "saved", exercise_id: "exercise", set_number: 1 }],
      }),
    },
  });
  await fresh.store.restoreActiveWorkout();
  let row = fresh.store.getActiveWorkout().workoutLogs.exercise[0];
  assert.equal(row.saveStatus, "error");
  assert.equal(row.needsReconcile, true);
  assert.equal(row.completed, false);
  assert.equal(row.backendId, undefined);
  assert.deepEqual(fresh.calls, []);
  await fresh.workout.retrySetLog("exercise", 0);
  assert.deepEqual(
    fresh.calls.map(([name]) => name),
    ["getSessionDetails", "updateSetLogApi"],
  );
  row = fresh.store.getActiveWorkout().workoutLogs.exercise[0];
  assert.equal(row.saveStatus, "saved");
  assert.equal(row.backendId, "saved");
});

test("an interrupted removal retains its intent and retry handles a DELETE already committed", async () => {
  const disk = new Map();
  const old = runtime({
    disk,
    api: { deleteSetLogApi: () => deferred().promise },
  });
  const session = fixture();
  session.workoutLogs.exercise.push({
    ...session.workoutLogs.exercise[0],
    setNumber: 2,
    backendId: "last",
    completed: true,
    saveStatus: "saved",
  });
  old.store.setActiveWorkout(session);
  void old.workout.removeSetFromExercise("exercise", 1);
  await new Promise(setImmediate);
  await old.store.flushWorkoutPersistence();
  const fresh = runtime({ disk });
  await fresh.store.restoreActiveWorkout();
  assert.equal(
    fresh.store.getActiveWorkout().workoutLogs.exercise[1].retryAction,
    "remove",
  );
  await fresh.workout.retrySetLog("exercise", 1);
  assert.equal(fresh.store.getActiveWorkout().workoutLogs.exercise.length, 1);
  assert.deepEqual(
    fresh.calls.map(([name]) => name),
    ["getSessionDetails"],
  );
});

test("dirty and failed inputs stay unsaved, while an interrupted finish becomes retryable", async () => {
  const disk = new Map();
  const old = runtime({ disk });
  const session = fixture();
  session.isFinishing = true;
  session.workoutLogs.exercise[0] = {
    ...session.workoutLogs.exercise[0],
    backendId: "saved",
    completed: true,
    saveStatus: "dirty",
  };
  old.store.setActiveWorkout(session);
  await old.store.flushWorkoutPersistence();
  const fresh = runtime({ disk });
  await fresh.store.restoreActiveWorkout();
  assert.equal(fresh.store.getActiveWorkout().isFinishing, false);
  assert.equal(
    fresh.store.getActiveWorkout().workoutLogs.exercise[0].saveStatus,
    "dirty",
  );
  await assert.rejects(fresh.workout.finishWorkoutSession(), /highlighted/);
  assert.deepEqual(fresh.calls, []);
});

test("clear is ordered after pending writes and a fresh process cannot resurrect the workout", async () => {
  const disk = new Map();
  const pending = deferred();
  const old = runtime({
    disk,
    storage: {
      setItem: async (key, value) => {
        await pending.promise;
        disk.set(key, value);
      },
    },
  });
  old.store.setActiveWorkout(fixture());
  old.store.clearActiveWorkout();
  pending.resolve();
  await old.store.flushWorkoutPersistence();
  assert.equal(await runtime({ disk }).store.restoreActiveWorkout(), null);
  assert.equal(disk.size, 0);
});

test("login scopes isolate disk snapshots and expiry removes the previous scope", async () => {
  const disk = new Map();
  const old = runtime({ disk });
  old.store.setActiveWorkout(fixture());
  await old.store.flushWorkoutPersistence();
  assert.equal(
    await runtime({ disk, scope: "login-b" }).store.restoreActiveWorkout(),
    null,
  );
  old.changeOwner(null);
  old.store.clearActiveWorkout();
  await old.store.flushWorkoutPersistence();
  assert.equal(disk.size, 0);
});

test("a slow hydration cannot replace a newer edit or restore data after logout", async () => {
  for (const logout of [false, true]) {
    const read = deferred();
    const current = runtime({ storage: { getItem: () => read.promise } });
    const restoring = current.store.restoreActiveWorkout();
    await new Promise(setImmediate);
    if (logout) {
      current.changeOwner(null);
      current.store.clearActiveWorkout();
    } else
      current.store.setActiveWorkout({
        ...fixture(),
        routineName: "Newer workout",
      });
    read.resolve(JSON.stringify({ version: 1, session: fixture() }));
    await restoring;
    assert.equal(
      current.store.getActiveWorkout()?.routineName ?? null,
      logout ? null : "Newer workout",
    );
  }
});

test("read failures and malformed snapshots block creation without overwriting the saved draft", async () => {
  for (const raw of [
    "{broken",
    JSON.stringify({ version: 99, session: fixture() }),
    JSON.stringify({
      version: 1,
      session: { ...fixture(), workoutLogs: { exercise: [{ weight: 10 }] } },
    }),
  ]) {
    const current = runtime({
      storage: {
        getItem: async () => raw,
        setItem: async () => assert.fail("must preserve disk"),
      },
    });
    await assert.rejects(current.workout.initOrResumeWorkout(routine));
    assert.notEqual(current.store.getWorkoutPersistenceError(), null);
    assert.deepEqual(current.calls, []);
    assert.equal(current.store.getActiveWorkout(), null);
  }
  let fail = true;
  const current = runtime({
    storage: {
      getItem: async () => {
        if (fail) throw new Error("Disk unavailable");
        return JSON.stringify({ version: 1, session: fixture() });
      },
    },
  });
  await assert.rejects(current.workout.initOrResumeWorkout(routine));
  fail = false;
  await current.workout.initOrResumeWorkout(routine);
  assert.equal(current.store.getActiveWorkout().routineId, "routine");
  assert.deepEqual(current.calls, []);
});

test("write errors leave memory usable and an explicit retry backs up the latest inputs", async () => {
  let fail = true;
  const disk = new Map();
  const current = runtime({
    disk,
    storage: {
      setItem: async (key, value) => {
        if (fail) throw new Error("Full disk");
        disk.set(key, value);
      },
    },
  });
  current.store.setActiveWorkout(fixture());
  await current.store.flushWorkoutPersistence();
  assert.match(current.store.getWorkoutPersistenceError(), /backed up/);
  current.store.editSetLog("exercise", 0, { reps: "15" });
  fail = false;
  await current.store.retryWorkoutPersistence();
  assert.equal(current.store.getWorkoutPersistenceError(), null);
  const fresh = runtime({ disk });
  await fresh.store.restoreActiveWorkout();
  assert.equal(
    fresh.store.getActiveWorkout().workoutLogs.exercise[0].reps,
    "15",
  );
});

test("concurrent cold initialization without a draft creates only one server session", async () => {
  const current = runtime();
  const [a, b] = await Promise.all([
    current.workout.initOrResumeWorkout(routine),
    current.workout.initOrResumeWorkout(routine),
  ]);
  assert.equal(a.sessionId, "new-session");
  assert.equal(a, b);
  assert.equal(
    current.calls.filter(([name]) => name === "createSession").length,
    1,
  );
});

test("an interrupted unmark retries deletion rather than resaving the completed set", async () => {
  const disk = new Map();
  const old = runtime({
    disk,
    api: { deleteSetLogApi: () => deferred().promise },
  });
  const session = fixture();
  session.workoutLogs.exercise[0] = {
    ...session.workoutLogs.exercise[0],
    backendId: "saved",
    completed: true,
    saveStatus: "saved",
  };
  old.store.setActiveWorkout(session);
  void old.workout.updateOrDeleteSetLog("exercise", 0, { completed: false });
  await new Promise(setImmediate);
  await old.store.flushWorkoutPersistence();
  const fresh = runtime({ disk });
  await fresh.store.restoreActiveWorkout();
  assert.equal(
    fresh.store.getActiveWorkout().workoutLogs.exercise[0].retryAction,
    "delete",
  );
  await fresh.workout.retrySetLog("exercise", 0);
  assert.deepEqual(
    fresh.calls.map(([name]) => name),
    ["getSessionDetails"],
  );
  assert.equal(
    fresh.store.getActiveWorkout().workoutLogs.exercise[0].completed,
    false,
  );
});

test("confirmed finish removes the snapshot and a lost finish response can be retried safely after a kill", async () => {
  const disk = new Map();
  const old = runtime({
    disk,
    api: { updateSession: () => deferred().promise },
  });
  old.store.setActiveWorkout(fixture());
  void old.workout.finishWorkoutSession();
  await new Promise(setImmediate);
  await old.store.flushWorkoutPersistence();
  const fresh = runtime({
    disk,
    api: {
      getSessionDetails: async () => ({
        id: "session",
        status: "completed",
        sets: [],
      }),
    },
  });
  await fresh.store.restoreActiveWorkout();
  assert.equal(fresh.store.getActiveWorkout().isFinishing, false);
  await fresh.workout.finishWorkoutSession();
  await fresh.store.flushWorkoutPersistence();
  assert.deepEqual(
    fresh.calls.map(([name]) => name),
    ["getSessionDetails"],
  );
  assert.equal(disk.size, 0);
  assert.equal(fresh.store.getActiveWorkout(), null);
});

test("late creation replies cannot modify a different login with the same workout timestamps", async () => {
  const create = deferred();
  const current = runtime({ api: { createSession: () => create.promise } });
  const initializing = current.workout.initOrResumeWorkout(routine);
  await new Promise(setImmediate);
  const before = current.store.getActiveWorkout();
  current.changeOwner("login-b");
  current.store.clearActiveWorkout();
  current.store.setActiveWorkout({ ...before, routineName: "Other account" });
  create.resolve({ id: "old-session" });
  await initializing;
  assert.equal(current.store.getActiveWorkout().sessionId, null);
  assert.equal(current.store.getActiveWorkout().routineName, "Other account");
});

test("logout during reconciliation prevents a write under the next account", async () => {
  const detail = deferred();
  const current = runtime({ api: { getSessionDetails: () => detail.promise } });
  current.store.setActiveWorkout(fixture());
  const saving = current.workout.logSetCompleted("exercise", 0);
  await new Promise(setImmediate);
  current.changeOwner("login-b");
  current.store.clearActiveWorkout();
  current.store.setActiveWorkout({
    ...fixture(),
    routineName: "Other account",
  });
  detail.resolve({ id: "session", status: "ongoing", sets: [] });
  await saving;
  assert.deepEqual(
    current.calls.map(([name]) => name),
    ["getSessionDetails"],
  );
  assert.equal(current.store.getActiveWorkout().routineName, "Other account");
  assert.equal(
    current.store.getActiveWorkout().workoutLogs.exercise[0].completed,
    false,
  );
});
