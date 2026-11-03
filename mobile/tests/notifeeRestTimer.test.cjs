const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
function load(name) {
  const filename = path.join(
    __dirname,
    "../src/features/workout/notifications",
    name + ".ts",
  );
  const mod = { exports: {} };
  vm.runInThisContext(
    "(function(require,module,exports){" +
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText +
      "})",
    { filename },
  )((name) => load(name.replace("./", "")), mod, mod.exports);
  return mod.exports;
}
const {
  createNotifeeRestTimer,
  matchesRestNotification,
  RUNNING_NOTIFICATION,
} = load("notifeeRestTimer");
const constants = {
  EventType: { DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2, DELIVERED: 3 },
  AlarmType: { SET_AND_ALLOW_WHILE_IDLE: 1, SET_EXACT_AND_ALLOW_WHILE_IDLE: 3 },
  AndroidImportance: { LOW: 2, DEFAULT: 3 },
  AndroidVisibility: { PUBLIC: 1 },
  AndroidNotificationSetting: { ENABLED: 1 },
  AuthorizationStatus: { AUTHORIZED: 1 },
  TriggerType: { TIMESTAMP: 0 },
};
const initial = () => ({
  id: "rest-1",
  workoutKey: "routine:1",
  routineId: "routine",
  title: "Pull",
  endAt: 100_000,
  version: 1,
  status: "active",
});
function setup(platform = "android", exact = true, granted = true) {
  let state = null;
  const displayed = new Map(),
    triggers = new Map(),
    calls = [];
  const api = {
    getTriggerNotifications: async () =>
      [...triggers.values()].map((x) => ({ notification: x.notification })),
    getDisplayedNotifications: async () =>
      [...displayed.values()].map((notification) => ({ notification })),
    cancelNotification: async (id) => {
      calls.push(["cancel", id]);
      triggers.delete(id);
      displayed.delete(id);
    },
    cancelDisplayedNotification: async (id) => {
      calls.push(["cancelDisplayed", id]);
      displayed.delete(id);
    },
    createChannel: async (channel) => {
      calls.push(["channel", channel]);
      return channel.id;
    },
    getNotificationSettings: async () => ({
      authorizationStatus: granted ? 1 : 0,
      android: { alarm: exact ? 1 : 0 },
    }),
    createTriggerNotification: async (notification, trigger) => {
      calls.push(["schedule", notification, trigger]);
      triggers.set(notification.id, { notification, trigger });
      return notification.id;
    },
    displayNotification: async (notification) => {
      calls.push(["display", notification]);
      displayed.set(notification.id, notification);
      return notification.id;
    },
  };
  const bridge = {
    getState: async () => (state ? JSON.stringify(state) : null),
    setTimer: async (json) => {
      state = { ...JSON.parse(json), version: 1 };
      return JSON.stringify(state);
    },
    clear: async () => {
      calls.push(["nativeClear"]);
      state = null;
    },
    promoteNotification: async (id) => calls.push(["promote", id]),
    performAction: async (action, id, version) => {
      calls.push(["action", action]);
      if (
        !state ||
        state.id !== id ||
        state.version !== version ||
        state.status !== "active"
      )
        return null;
      state = { ...state, version: state.version + 1 };
      if (action === "add") state.endAt += 30_000;
      if (action === "skip") {
        state.status = "skipped";
        state.endAt = 0;
      }
      if (action === "complete") state.status = "complete";
      if (action === "dismiss") state.surfaceDismissed = true;
      return JSON.stringify(state);
    },
  };
  const timer = createNotifeeRestTimer(
    bridge,
    api,
    constants,
    platform,
    () => 1_000,
  );
  const start = () => timer.adapter.setTimer(JSON.stringify(initial()), 0);
  const action = (notification, id) =>
    timer.handleEvent({
      type: constants.EventType.ACTION_PRESS,
      detail: { notification, pressAction: { id } },
    });
  return {
    ...timer,
    bridge,
    api,
    displayed,
    triggers,
    calls,
    start,
    action,
    state: () => state,
  };
}

test("Android uses one system countdown and one expiry alarm, without a foreground service", async () => {
  const t = setup();
  await t.start();
  const running = t.displayed.get(RUNNING_NOTIFICATION);
  assert.equal(running.android.showChronometer, true);
  assert.equal(running.android.showTimestamp, true);
  assert.deepEqual(running.android.defaults, []);
  assert.equal(running.android.chronometerDirection, "down");
  assert.equal(running.android.timestamp, 100_000);
  assert.equal(running.android.asForegroundService, undefined);
  assert.equal(running.android.actions.length, 2);
  assert.equal(t.triggers.size, 1);
  assert.equal([...t.triggers.values()][0].trigger.alarmManager.type, 3);
  assert.ok(t.calls.some(([name]) => name === "promote"));
});

test("without exact-alarm access Notifee uses an inexact idle-aware alarm", async () => {
  const t = setup("android", false);
  await t.start();
  assert.equal([...t.triggers.values()][0].trigger.alarmManager.type, 1);
});

test("denied notification permission schedules no alarm", async () => {
  const t = setup("android", false, false);
  await t.start();
  assert.equal(t.triggers.size, 0);
  assert.equal(t.displayed.size, 0);
});

test("+30 replaces the old trigger and updates the same ongoing countdown", async () => {
  const t = setup();
  await t.start();
  const old = t.displayed.get(RUNNING_NOTIFICATION);
  const oldTriggerId = [...t.triggers.keys()][0];
  await t.action(old, "add-rest-time");
  assert.equal(t.state().endAt, 130_000);
  assert.equal(
    t.calls.some(
      ([name, id]) => name === "cancel" && id === RUNNING_NOTIFICATION,
    ),
    false,
  );
  assert.equal(t.triggers.has(oldTriggerId), false);
  assert.equal(t.triggers.size, 1);
  assert.equal(
    t.displayed.get(RUNNING_NOTIFICATION).android.timestamp,
    130_000,
  );
  const schedules = t.calls.filter(([name]) => name === "schedule").length;
  await t.action(old, "add-rest-time");
  assert.equal(t.state().endAt, 130_000);
  assert.equal(
    t.calls.filter(([name]) => name === "schedule").length,
    schedules,
  );
});

test("skip cancels countdown and completion; late events cannot restart it", async () => {
  const t = setup();
  await t.start();
  const old = t.displayed.get(RUNNING_NOTIFICATION);
  await t.action(old, "skip-rest");
  await t.action(old, "add-rest-time");
  assert.equal(t.state().status, "skipped");
  assert.equal(t.triggers.size, 0);
  assert.equal(t.displayed.size, 0);
});

test("expiry removes only the countdown and preserves the completion alert", async () => {
  const t = setup();
  await t.start();
  const complete = [...t.triggers.values()][0].notification;
  t.displayed.set(complete.id, complete);
  await t.handleEvent({ type: 3, detail: { notification: complete } });
  assert.equal(t.state().status, "complete");
  assert.equal(t.displayed.has(complete.id), true);
  assert.equal(t.displayed.has(RUNNING_NOTIFICATION), false);
});

test("dismissal does not repost the countdown but retains a single end alert", async () => {
  const t = setup();
  await t.start();
  const running = t.displayed.get(RUNNING_NOTIFICATION);
  await t.handleEvent({ type: 0, detail: { notification: running } });
  assert.equal(t.displayed.has(RUNNING_NOTIFICATION), false);
  assert.equal(t.triggers.size, 1);
});

test("cleanup is scoped to workout rest notifications", async () => {
  const t = setup();
  t.displayed.set("other", { id: "other", data: { kind: "other-feature" } });
  await t.start();
  await t.adapter.clear();
  assert.equal(t.displayed.has("other"), true);
  assert.equal(t.displayed.size, 1);
  assert.equal(t.triggers.size, 0);
});

test("iOS leaves scheduling to the native Notifee/AppIntent adapter", async () => {
  const t = setup("ios");
  await t.start();
  await t.adapter.clear();
  assert.deepEqual(
    t.calls.map(([name]) => name),
    ["nativeClear"],
  );
});

test("a delayed Notifee post is cleaned up after a concurrent finish", async () => {
  const t = setup();
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const display = t.api.displayNotification;
  t.api.displayNotification = async (notification) => {
    await pending;
    return display(notification);
  };
  const starting = t.start();
  await new Promise(setImmediate);
  const clearing = t.adapter.clear();
  release();
  await Promise.all([starting, clearing]);
  assert.equal(t.state(), null);
  assert.equal(t.displayed.size, 0);
  assert.equal(t.triggers.size, 0);
});

test("notification taps match the current rest, including its deadline", () => {
  const state = initial();
  const notification = {
    data: {
      kind: "rest-timer",
      timerId: state.id,
      routineId: state.routineId,
      endAt: String(state.endAt),
    },
  };
  assert.equal(matchesRestNotification(notification, state), true);
  assert.equal(
    matchesRestNotification(notification, { ...state, endAt: 130_000 }),
    false,
  );
  assert.equal(
    matchesRestNotification(notification, { ...state, status: "skipped" }),
    false,
  );
  assert.equal(matchesRestNotification(notification, null), false);
});
