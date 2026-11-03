const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const filename = path.join(
  __dirname,
  "../src/features/workout/notifications/expoRestNotifications.ts",
);
const mod = { exports: {} };
vm.runInThisContext(
  "(function(module,exports){" +
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText +
    "})",
  { filename },
)(mod, mod.exports);
const {
  createExpoRestNotifications,
  matchesRestNotification,
  hasNotificationPermission,
} = mod.exports;
const state = {
  id: "rest-1",
  routineId: "routine-1",
  status: "active",
  endAt: 100_000,
};
const data = {
  kind: "rest-timer",
  timerId: state.id,
  routineId: state.routineId,
  endAt: String(state.endAt),
  version: "1",
};
const response = (overrides = {}) => ({
  actionIdentifier: "default",
  notification: {
    request: {
      identifier: "zerobuff.rest.complete",
      content: { data: { ...data, ...overrides } },
    },
  },
});
function setup(platform = "android") {
  let listener,
    resolveLast,
    removed = false;
  const channels = [];
  const api = {
    DEFAULT_ACTION_IDENTIFIER: "default",
    AndroidImportance: { LOW: 2, DEFAULT: 3 },
    setNotificationChannelAsync: async (id, config) =>
      channels.push([id, config]),
    addNotificationResponseReceivedListener: (fn) => {
      listener = fn;
      return {
        remove: () => {
          removed = true;
        },
      };
    },
    getLastNotificationResponseAsync: () =>
      new Promise((resolve) => {
        resolveLast = resolve;
      }),
  };
  return {
    ...createExpoRestNotifications(api, platform),
    channels,
    emit: (value) => listener(value),
    last: (value) => resolveLast(value),
    removed: () => removed,
  };
}

test("Android prepares a quiet countdown channel and an audible completion channel", async () => {
  const t = setup();
  await t.prepare();
  assert.deepEqual(t.channels, [
    [
      "zerobuff.rest.ongoing",
      {
        name: "Rest countdown",
        importance: 2,
        sound: null,
        enableVibrate: false,
      },
    ],
    [
      "zerobuff.rest.complete",
      { name: "Rest complete", importance: 3, sound: "default" },
    ],
  ]);
});
test("iOS does not call Android channel APIs", async () => {
  const t = setup("ios");
  await t.prepare();
  assert.equal(t.channels.length, 0);
});
test("cold-launch and live response events open a notification only once", async () => {
  const t = setup(),
    received = [];
  t.subscribePress((value) => received.push(value));
  t.emit(response());
  t.last(response());
  await new Promise(setImmediate);
  assert.equal(received.length, 1);
});
test("a later rest with the same notification identifier can still open", () => {
  const t = setup(),
    received = [];
  t.subscribePress((value) => received.push(value));
  t.emit(response());
  t.emit(response({ timerId: "rest-2" }));
  assert.equal(received.length, 2);
});
test("other notifications, missing data and non-default actions are ignored", () => {
  const t = setup(),
    received = [];
  t.subscribePress((value) => received.push(value));
  t.emit(response({ kind: "another-feature" }));
  t.emit({ ...response(), actionIdentifier: "dismiss" });
  t.emit({
    actionIdentifier: "default",
    notification: { request: { identifier: "other", content: {} } },
  });
  assert.equal(received.length, 0);
});
test("a delayed cold response does not navigate after unmount/logout", async () => {
  const t = setup(),
    received = [];
  const stop = t.subscribePress((value) => received.push(value));
  stop();
  t.last(response());
  await new Promise(setImmediate);
  assert.equal(t.removed(), true);
  assert.equal(received.length, 0);
});
test("notification taps reject other workouts, skipped timers and old deadlines", () => {
  assert.equal(matchesRestNotification(data, state), true);
  assert.equal(
    matchesRestNotification(data, { ...state, status: "complete" }),
    true,
  );
  for (const changed of [
    null,
    { ...state, routineId: "other" },
    { ...state, status: "skipped" },
    { ...state, endAt: 130_000 },
  ]) {
    assert.equal(matchesRestNotification(data, changed), false);
  }
});
test("permission accepts authorized and provisional iOS delivery, not denial", () => {
  assert.equal(hasNotificationPermission({ granted: true }), true);
  assert.equal(
    hasNotificationPermission({ granted: false, ios: { status: 3 } }),
    true,
  );
  assert.equal(
    hasNotificationPermission({ granted: false, ios: { status: 1 } }),
    false,
  );
  assert.equal(hasNotificationPermission({ granted: false }), false);
});
