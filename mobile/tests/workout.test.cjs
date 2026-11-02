const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the actual TypeScript modules with only network/native boundaries stubbed.
function setup(overrides = {}) {
  const calls = [];
  const api = {
    getSessionDetails: async () => ({
      id: "session",
      status: "ongoing",
      sets: [],
    }),
    createSetLogApi: async () => ({ id: "saved" }),
    updateSetLogApi: async () => ({ id: "saved" }),
    deleteSetLogApi: async () => {},
    updateSession: async () => ({ id: "session", status: "completed" }),
    ...overrides,
  };
  for (const key of Object.keys(api)) {
    const original = api[key];
    api[key] = (...args) => {
      calls.push([key, ...args]);
      return original(...args);
    };
  }
  const cache = {};
  const stubs = {
    react: { useSyncExternalStore() {} },
    "@/features/routines/api/routines": {},
    "@/features/workout/api/session": api,
    "@/shared/api/queryClient": {
      queryClient: {
        invalidateQueries: async (key) => calls.push(["invalidate", key]),
        setQueryData() {},
      },
    },
  };
  function load(name) {
    if (stubs[name]) return stubs[name];
    if (cache[name]) return cache[name].exports;
    const file = path.join(__dirname, "../src", name.replace("@/", "") + ".ts");
    const mod = { exports: {} };
    cache[name] = mod;
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInThisContext(
      "(function(require, module, exports) {" + code + "\n})",
      { filename: file },
    )((dependency) => load(dependency.startsWith(".") ? path.posix.join(path.posix.dirname(name), dependency) : dependency), mod, mod.exports);
    return mod.exports;
  }
  const workout = load("@/features/workout/utils/workout");
  const store = load("@/features/workout/store/activeWorkoutStore");
  const errors = load("@/shared/api/errors");
  store.setActiveWorkout({
    sessionId: "session",
    routineId: "routine",
    routineName: "Test",
    currentExerciseIndex: 0,
    startedAtTimestamp: 1,
    pausedAtTimestamp: null,
    accumulatedPauseMs: 0,
    isPaused: false,
    workoutLogs: {
      exercise: [
        { setNumber: 1, weight: "20", reps: "10", rir: "", completed: false },
      ],
    },
  });
  return {
    workout,
    store,
    errors,
    loadErrorMessage: load("@/shared/api/loadError").loadErrorMessage,
    calls,
    row: () => store.getActiveWorkout().workoutLogs.exercise[0],
  };
}
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

test("pending creation blocks duplicate taps, editing, deletion and finishing", async () => {
  const request = deferred();
  const t = setup({ createSetLogApi: () => request.promise });
  const pending = t.workout.logSetCompleted("exercise", 0);
  await new Promise(setImmediate);
  assert.equal(t.row().saveStatus, "pending");
  assert.match(t.row().backendId, /^tmp-/);
  await t.workout.logSetCompleted("exercise", 0);
  t.store.editSetLog("exercise", 0, { weight: "99" });
  assert.equal(t.row().weight, "20");
  assert.equal(await t.workout.removeSetFromExercise("exercise", 0), false);
  await assert.rejects(t.workout.finishWorkoutSession(), /Wait/);
  request.resolve({ id: "saved" });
  await pending;
  assert.equal(t.row().saveStatus, "saved");
  assert.equal(t.row().backendId, "saved");
  assert.equal(t.calls.filter((c) => c[0] === "createSetLogApi").length, 1);
});

test("failed save rolls back completion, preserves input and can be retried", async () => {
  let fail = true;
  const t = setup({
    createSetLogApi: async () => {
      if (fail) throw new Error("offline");
      return { id: "saved" };
    },
  });
  await t.workout.logSetCompleted("exercise", 0);
  assert.equal(t.row().completed, false);
  assert.equal(t.row().weight, "20");
  assert.equal(t.row().saveStatus, "error");
  await assert.rejects(t.workout.finishWorkoutSession(), /highlighted/);
  fail = false;
  await t.workout.retrySetLog("exercise", 0);
  assert.equal(t.row().saveStatus, "saved");
});

test("lost POST response is reconciled before retry without another POST", async () => {
  let committed = false;
  const t = setup({
    getSessionDetails: async () => ({
      sets: committed
        ? [{ id: "saved", exercise_id: "exercise", set_number: 1 }]
        : [],
    }),
    createSetLogApi: async () => {
      committed = true;
      throw new Error("response lost");
    },
  });
  await t.workout.logSetCompleted("exercise", 0);
  await t.workout.retrySetLog("exercise", 0);
  assert.equal(t.row().saveStatus, "saved");
  assert.equal(t.calls.filter((c) => c[0] === "createSetLogApi").length, 1);
});

test("failed update preserves draft and failed unmark preserves completion", async () => {
  const t = setup({
    getSessionDetails: async () => ({
      sets: [{ id: "saved", exercise_id: "exercise", set_number: 1 }],
    }),
    updateSetLogApi: async () => {
      throw new Error("offline");
    },
    deleteSetLogApi: async () => {
      throw new Error("offline");
    },
  });
  t.store.updateLocalSetLog("exercise", 0, {
    backendId: "saved",
    completed: true,
  });
  t.store.editSetLog("exercise", 0, { weight: "25" });
  await t.workout.updateOrDeleteSetLog("exercise", 0, {});
  assert.equal(t.row().weight, "25");
  assert.equal(t.row().saveStatus, "error");
  await t.workout.updateOrDeleteSetLog("exercise", 0, { completed: false });
  assert.equal(t.row().completed, true);
  assert.equal(t.row().retryAction, "delete");
});

test("finish failure retains workout and retry clears only after acknowledgement", async () => {
  let fail = true;
  const t = setup({
    updateSession: async () => {
      if (fail) throw new Error("offline");
      return { id: "session", status: "completed" };
    },
  });
  await assert.rejects(t.workout.finishWorkoutSession(), /offline/);
  assert.ok(t.store.getActiveWorkout());
  assert.equal(t.store.getActiveWorkout().isFinishing, false);
  fail = false;
  assert.equal(await t.workout.finishWorkoutSession(), true);
  assert.equal(t.store.getActiveWorkout(), null);
});

test("pending finish blocks duplicate finish and set writes", async () => {
  const request = deferred();
  const t = setup({ updateSession: () => request.promise });
  const finishing = t.workout.finishWorkoutSession();
  await new Promise(setImmediate);
  assert.ok(t.store.getActiveWorkout());
  assert.equal(await t.workout.finishWorkoutSession(), false);
  await t.workout.logSetCompleted("exercise", 0);
  assert.equal(t.calls.filter((c) => c[0] === "createSetLogApi").length, 0);
  request.resolve({ id: "session", status: "completed" });
  await finishing;
});

test("already completed server session makes finish retry successful", async () => {
  const t = setup({
    getSessionDetails: async () => ({
      id: "session",
      status: "completed",
      sets: [],
    }),
  });
  assert.equal(await t.workout.finishWorkoutSession(), true);
  assert.equal(t.calls.filter((c) => c[0] === "updateSession").length, 0);
});

test("invalid input never sends a write; decimal comma is supported", async () => {
  const t = setup();
  assert.equal(
    t.workout.parseSetInputValues("82,5", "10", "0").weightNum,
    82.5,
  );
  for (const values of [
    ["", "10", ""],
    ["-1", "10", ""],
    ["20", "2.5", ""],
    ["20", "10", "11"],
    ["20junk", "10", ""],
  ]) {
    assert.throws(() => t.workout.parseSetInputValues(...values));
  }
  t.store.editSetLog("exercise", 0, { weight: "" });
  await t.workout.logSetCompleted("exercise", 0);
  assert.equal(t.row().saveStatus, "error");
  assert.equal(t.calls.filter((c) => c[0] === "createSetLogApi").length, 0);
});

test("late response cannot modify a replacement workout", async () => {
  const request = deferred();
  const t = setup({ createSetLogApi: () => request.promise });
  const saving = t.workout.logSetCompleted("exercise", 0);
  await new Promise(setImmediate);
  const replacement = {
    ...t.store.getActiveWorkout(),
    startedAtTimestamp: 2,
    workoutLogs: {
      exercise: [
        { setNumber: 1, weight: "50", reps: "5", rir: "", completed: false },
      ],
    },
  };
  t.store.setActiveWorkout(replacement);
  request.resolve({ id: "old-session-set" });
  await saving;
  assert.equal(t.row().backendId, undefined);
  assert.equal(t.row().weight, "50");
});

test("failed initial session creation can be retried on save", async () => {
  const t = setup({ createSession: async () => ({ id: "recovered" }) });
  t.store.setActiveWorkout({ ...t.store.getActiveWorkout(), sessionId: null });
  await t.workout.logSetCompleted("exercise", 0);
  assert.equal(t.store.getActiveWorkout().sessionId, "recovered");
  assert.equal(t.row().saveStatus, "saved");
});

test("editing a failed new set keeps finish blocked until the draft is saved", async () => {
  let fail = true;
  const t = setup({
    createSetLogApi: async () => {
      if (fail) throw new Error("offline");
      return { id: "saved" };
    },
  });
  await t.workout.logSetCompleted("exercise", 0);
  t.store.editSetLog("exercise", 0, { weight: "25" });
  assert.equal(t.row().saveStatus, "dirty");
  await assert.rejects(t.workout.finishWorkoutSession(), /highlighted/);
  fail = false;
  await t.workout.updateOrDeleteSetLog("exercise", 0, {});
  assert.equal(t.row().saveStatus, "saved");
});

test("loading errors provide actionable messages without exposing server details", () => {
  const { errors, loadErrorMessage } = setup();
  assert.match(
    loadErrorMessage(new errors.NetworkError()),
    /internet connection/,
  );
  for (const [status, pattern] of [
    [401, /session/],
    [403, /access/],
    [404, /no longer/],
    [429, /minute/],
    [503, /temporarily/],
  ]) {
    const message = loadErrorMessage(
      new errors.ApiError(status, "private server detail"),
    );
    assert.match(message, pattern);
    assert.doesNotMatch(message, /private server detail/);
  }
  assert.match(loadErrorMessage(new Error("private")), /try again/);
});
