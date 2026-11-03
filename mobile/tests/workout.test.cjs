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
    "@/features/auth/store/tokenStore": { tokenStore: { getSessionScope: () => null } },
    "@react-native-async-storage/async-storage": { __esModule: true, default: {
      getItem: async () => null, setItem: async () => {}, removeItem: async () => {},
    } },
    "@/features/routines/api/routines": {},
    "@/features/workout/api/session": api,
    "@/shared/api/queryClient": {
      queryClient: {
        invalidateQueries: async (key) => calls.push(["invalidate", key]),
        setQueriesData: (filters, updater) => calls.push(["setQueriesData", filters, updater]),
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
    )(
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
    experience: load("@/features/workout/utils/experience"),
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

test("summary counts only confirmed sets and compares bodyweight by reps", () => {
  const { experience, store } = setup();
  const session = store.getActiveWorkout();
  session.workoutLogs.exercise = [
    {
      setNumber: 1,
      weight: "0",
      reps: "12",
      rir: "",
      completed: true,
      backendId: "saved",
      saveStatus: "saved",
    },
    {
      setNumber: 2,
      weight: "20",
      reps: "10",
      rir: "",
      completed: true,
      backendId: "tmp-test",
      saveStatus: "pending",
    },
  ];
  const summary = experience.summarizeWorkout(session, 100, {
    exercise: [{ weight: 0, reps: 10 }],
  });
  assert.equal(summary.sets, 1);
  assert.equal(summary.exercises, 1);
  assert.equal(summary.volume, 0);
  assert.equal(summary.improvements.length, 1);
  assert.equal(summary.durationSeconds, 100);
  assert.equal(summary.hasAddedLoad, false);
  assert.equal(summary.reps, 12);
  assert.equal(summary.improvements[0].metric, "reps");
  assert.equal(summary.improvements[0].previous, 10);
  assert.equal(summary.improvements[0].current, 12);
});

test("auto rest starts after confirmed save, can be disabled, and supports zero load", async () => {
  const t = setup();
  t.store.editSetLog("exercise", 0, { weight: "0" });
  await t.workout.logSetCompleted("exercise", 0, 60);
  assert.ok(t.store.getActiveWorkout().restEndTimestamp > Date.now());
  assert.equal(
    t.calls.find((call) => call[0] === "createSetLogApi")[3].weight,
    0,
  );
  const manual = setup();
  manual.store.toggleAutoRest();
  await manual.workout.logSetCompleted("exercise", 0, 60);
  assert.equal(manual.store.getActiveWorkout().restEndTimestamp, undefined);
});

test("failed save never starts auto rest", async () => {
  const t = setup({
    createSetLogApi: async () => {
      throw new Error("offline");
    },
  });
  await t.workout.logSetCompleted("exercise", 0, 60);
  assert.equal(t.store.getActiveWorkout().restEndTimestamp, undefined);
});

test("saved status excludes optimistic, dirty, failed and deleted sets", () => {
  const { experience } = setup();
  const saved = {
    setNumber: 1,
    weight: "10",
    reps: "10",
    rir: "",
    completed: true,
    backendId: "saved",
    saveStatus: "saved",
  };
  assert.equal(experience.isSetSaved(saved), true);
  for (const changes of [
    { backendId: "tmp-test" },
    { saveStatus: "pending" },
    { saveStatus: "dirty" },
    { saveStatus: "error" },
    { completed: false },
  ])
    assert.equal(experience.isSetSaved({ ...saved, ...changes }), false);
});

test("next series wraps to unfinished sets and never invents an extra series", () => {
  const { experience } = setup();
  const row = {
    setNumber: 1,
    weight: "10",
    reps: "10",
    rir: "",
    completed: true,
    backendId: "saved",
    saveStatus: "saved",
  };
  assert.equal(
    experience.nextIncompleteSet([row, { ...row, completed: false }, row], 0),
    1,
  );
  assert.equal(
    experience.nextIncompleteSet([{ ...row, completed: false }, row, row], 2),
    0,
  );
  assert.equal(experience.nextIncompleteSet([row, row], 0), -1);
  assert.equal(experience.nextIncompleteSet([], 0), -1);
});

test("returning home only pauses and never resumes an already paused workout", () => {
  const { store } = setup();
  store.pauseWorkout();
  const pausedAt = store.getActiveWorkout().pausedAtTimestamp;
  store.pauseWorkout();
  assert.equal(store.getActiveWorkout().isPaused, true);
  assert.equal(store.getActiveWorkout().pausedAtTimestamp, pausedAt);
});

test("advance requires a confirmed new set and unchanged user context", () => {
  const { store, experience } = setup();
  const before = store.getActiveWorkout();
  const first = before.workoutLogs.exercise[0];
  const after = {
    ...before,
    workoutLogs: {
      exercise: [
        { ...first, backendId: "saved", completed: true, saveStatus: "saved" },
        { ...first, setNumber: 2 },
      ],
    },
  };
  assert.equal(
    experience.nextSetAfterSave(before, after, "exercise", 0, false),
    1,
  );
  assert.equal(
    experience.nextSetAfterSave(before, after, "exercise", 0, true),
    -1,
  );
  assert.equal(
    experience.nextSetAfterSave(
      before,
      { ...after, currentExerciseIndex: 1 },
      "exercise",
      0,
      false,
    ),
    -1,
  );
  assert.equal(
    experience.nextSetAfterSave(
      before,
      { ...after, startedAtTimestamp: 999 },
      "exercise",
      0,
      false,
    ),
    -1,
  );
  assert.equal(
    experience.nextSetAfterSave(before, before, "exercise", 0, false),
    -1,
  );
  assert.equal(
    experience.nextSetAfterSave(after, after, "exercise", 0, false),
    -1,
  );
});

test("saved last card is removed only after server confirmation", async () => {
  const request = deferred();
  const t = setup({ deleteSetLogApi: () => request.promise });
  t.store.addLocalSetToExercise("exercise", 10);
  t.store.updateLocalSetLog("exercise", 1, {
    completed: true,
    backendId: "saved-last",
    saveStatus: "saved",
  });
  const removing = t.workout.removeSetFromExercise("exercise", 1);
  assert.equal(t.store.getActiveWorkout().workoutLogs.exercise.length, 2);
  assert.equal(
    t.store.getActiveWorkout().workoutLogs.exercise[1].saveStatus,
    "pending",
  );
  await assert.rejects(t.workout.finishWorkoutSession(), /Wait/);
  request.resolve();
  assert.equal(await removing, true);
  assert.equal(t.store.getActiveWorkout().workoutLogs.exercise.length, 1);
  assert.equal(await t.workout.removeSetFromExercise("exercise", 0), false);
});

test("failed deletion preserves the saved card and permits retry", async () => {
  let fail = true;
  const t = setup({
    deleteSetLogApi: async () => {
      if (fail) throw new Error("offline");
    },
  });
  t.store.addLocalSetToExercise("exercise", 10);
  t.store.updateLocalSetLog("exercise", 1, {
    completed: true,
    backendId: "saved-last",
    saveStatus: "saved",
  });
  await assert.rejects(
    t.workout.removeSetFromExercise("exercise", 1),
    /offline/,
  );
  assert.equal(
    t.store.getActiveWorkout().workoutLogs.exercise[1].saveStatus,
    "saved",
  );
  fail = false;
  assert.equal(await t.workout.removeSetFromExercise("exercise", 1), true);
});

test("summary exposes named volume improvements and total reps for mixed workouts", () => {
  const { experience, store } = setup();
  const session = store.getActiveWorkout();
  const saved = (weight, reps, id) => ({
    setNumber: 1,
    weight,
    reps,
    rir: "",
    completed: true,
    backendId: id,
    saveStatus: "saved",
  });
  session.workoutLogs = {
    loaded: [saved("22,5", "10", "a")],
    bodyweight: [saved("0", "12", "b")],
    unchanged: [saved("10", "5", "c")],
  };
  const summary = experience.summarizeWorkout(
    session,
    100,
    {
      loaded: [{ weight: 20, reps: 10 }],
      unchanged: [{ weight: 10, reps: 5 }],
    },
    { loaded: "Dumbbell row" },
  );
  assert.equal(summary.sessionId, session.sessionId);
  assert.equal(summary.reps, 27);
  assert.equal(summary.volume, 275);
  assert.equal(summary.hasAddedLoad, true);
  assert.equal(summary.comparedExercises, 2);
  assert.equal(summary.exercises, 3);
  assert.equal(summary.improvements.length, 1);
  assert.equal(summary.improvements[0].name, "Dumbbell row");
  assert.equal(summary.improvements[0].metric, "volume");
  assert.equal(summary.improvements[0].previous, 200);
  assert.equal(summary.improvements[0].current, 225);
});

test("empty summary does not treat drafts as performed work", () => {
  const { experience, store } = setup();
  const session = store.getActiveWorkout();
  const summary = experience.summarizeWorkout(session, 65);
  assert.equal(summary.sets, 0);
  assert.equal(summary.exercises, 0);
  assert.equal(summary.reps, 0);
  assert.equal(summary.hasAddedLoad, false);
  assert.equal(summary.comparedExercises, 0);
  assert.equal(summary.improvements.length, 0);
});

test("finish exposes the confirmed id even when the server session is created on finish", async () => {
  const t = setup({ createSession: async () => ({ id: "new-session" }) });
  t.store.setSessionBackendId(null);
  let confirmedId;
  assert.equal(
    await t.workout.finishWorkoutSession((id) => {
      confirmedId = id;
    }),
    true,
  );
  assert.equal(confirmedId, "new-session");
  assert.equal(t.store.getActiveWorkout(), null);
});

test("rest intervals keep identity for adjustments and reject old native actions", () => {
  const { store } = setup();
  store.setWorkoutRestEndTimestamp(Date.now() + 90_000);
  const id = store.getActiveWorkout().restTimerId;
  store.setWorkoutRestEndTimestamp(Date.now() + 120_000);
  assert.equal(store.getActiveWorkout().restTimerId, id);
  const workoutKey = "routine:1";
  store.applyNativeRestTimer({
    id: "obsolete",
    workoutKey,
    endAt: 0,
    status: "skipped",
  });
  assert.ok(store.getActiveWorkout().restEndTimestamp > Date.now());
  store.applyNativeRestTimer({ id, workoutKey, endAt: 0, status: "skipped" });
  assert.equal(store.getActiveWorkout().restEndTimestamp, null);
  store.setWorkoutRestEndTimestamp(Date.now() + 90_000);
  assert.notEqual(store.getActiveWorkout().restTimerId, id);
});


test("saving a set refreshes session lists, its real detail key and exercise stats", async () => {
  const t = setup();
  await t.workout.logSetCompleted("exercise", 0);
  const keys = t.calls.filter(([name]) => name === "invalidate").map(([, filters]) => filters.queryKey);
  assert.ok(keys.some((key) => JSON.stringify(key) === '["sessions","list"]'));
  assert.ok(keys.some((key) => JSON.stringify(key) === '["sessions","detail","session"]'));
  assert.ok(keys.some((key) => JSON.stringify(key) === '["exercises","stats","exercise"]'));
});

test("finishing updates every cached session list without overwriting details", async () => {
  const t = setup();
  await t.workout.finishWorkoutSession();
  const [, filters, updater] = t.calls.find(([name]) => name === "setQueriesData");
  assert.deepEqual(filters, { queryKey: ["sessions", "list"] });
  assert.equal(updater(undefined), undefined);
  const other = { id: "other", status: "ongoing" };
  const result = updater([{ id: "session", status: "ongoing" }, other]);
  assert.equal(result[0].status, "completed");
  assert.equal(result[1], other);
});


test("workout duration excludes paused time across pause and resume", (context) => {
  let now = 1000;
  context.mock.method(Date, "now", () => now);
  const t = setup();
  t.store.setActiveWorkout({
    ...t.store.getActiveWorkout(),
    startedAtTimestamp: now,
    pausedAtTimestamp: null,
    accumulatedPauseMs: 0,
    isPaused: false,
  });
  now = 6200;
  assert.equal(t.store.getActiveWorkoutDurationSeconds(), 5);
  t.store.toggleWorkoutPause();
  now = 17000;
  assert.equal(t.store.getActiveWorkoutDurationSeconds(), 5);
  t.store.toggleWorkoutPause();
  now = 19000;
  assert.equal(t.store.getActiveWorkoutDurationSeconds(), 7);
});
