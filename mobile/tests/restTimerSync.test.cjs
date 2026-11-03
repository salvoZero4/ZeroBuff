const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const filename = require("node:path").join(
  __dirname,
  "../src/features/workout/notifications/restTimerSync.ts",
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
const { RestTimerSync, parseNativeTimer } = mod.exports;

const snapshot = (overrides = {}) => ({
  workoutKey: "workout:1",
  routineId: "routine",
  title: "Pull",
  id: "rest-1",
  endAt: 100_000,
  ...overrides,
});
const nativeState = (overrides = {}) => ({
  ...snapshot(),
  version: 1,
  status: "active",
  ...overrides,
});
function setup(initial = null, authorize = async () => {}) {
  let native = initial;
  const calls = [],
    applied = [],
    failures = [];
  const adapter = {
    getState: async () => (native ? JSON.stringify(native) : null),
    setTimer: async (json, version) => {
      const next = JSON.parse(json);
      calls.push(["set", next.id, next.endAt]);
      if (native?.id === next.id && native.version !== version)
        return JSON.stringify(native);
      native = { ...next, version: version + 1 };
      return JSON.stringify(native);
    },
    clear: async () => {
      calls.push(["clear"]);
      native = null;
    },
    authorize,
  };
  const sync = new RestTimerSync(
    adapter,
    (state) => applied.push(state),
    () => failures.push(true),
  );
  return {
    sync,
    adapter,
    calls,
    applied,
    failures,
    native: () => native,
    change: (value) => {
      native = value;
    },
  };
}
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("identical state never republishes the timer or requests permission again", async () => {
  let permissions = 0;
  const t = setup(null, async () => {
    permissions++;
  });
  await t.sync.update(snapshot());
  for (let i = 0; i < 100; i++) await t.sync.update(snapshot());
  assert.equal(permissions, 1);
  assert.equal(t.calls.length, 1);
});

test("adjustment replaces the same timer; skip clears the pending alert", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  await t.sync.update(snapshot({ endAt: 130_000 }));
  assert.equal(t.native().endAt, 130_000);
  assert.equal(t.native().id, "rest-1");
  await t.sync.update(snapshot({ endAt: null }));
  assert.equal(t.native(), null);
});

test("native +30 and skip reconcile without overwriting them with stale JS state", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  t.change(nativeState({ version: 2, endAt: 130_000 }));
  await t.sync.refresh();
  await t.sync.update(snapshot({ endAt: 130_000 }));
  assert.equal(t.calls.length, 1);
  assert.equal(t.applied.at(-1).endAt, 130_000);
  t.change(nativeState({ version: 3, status: "skipped", endAt: 0 }));
  await t.sync.refresh();
  await t.sync.update(snapshot({ endAt: null }));
  assert.equal(t.calls.length, 1);
  assert.equal(t.applied.at(-1).status, "skipped");
});

test("cold restoration adopts only a timer belonging to the restored workout", async () => {
  const t = setup(nativeState({ endAt: 130_000, version: 5 }));
  await t.sync.update(snapshot({ id: null, endAt: null }));
  assert.equal(t.applied[0].endAt, 130_000);
  assert.equal(t.calls.length, 0);
  await t.sync.update(
    snapshot({ workoutKey: "another:2", id: null, endAt: null }),
  );
  assert.equal(t.native(), null);
});

test("finish during a slow permission dialog never posts an orphan timer", async () => {
  const permission = deferred();
  const t = setup(null, () => permission.promise);
  const starting = t.sync.update(snapshot());
  await new Promise(setImmediate);
  const finishing = t.sync.update(null);
  permission.resolve();
  await Promise.all([starting, finishing]);
  assert.equal(t.calls.filter(([name]) => name === "set").length, 0);
  assert.equal(t.native(), null);
});

test("a slow native post is always cleared after finishing", async () => {
  const pending = deferred();
  const t = setup();
  const set = t.adapter.setTimer;
  t.adapter.setTimer = async (...args) => {
    await pending.promise;
    return set(...args);
  };
  const starting = t.sync.update(snapshot());
  await new Promise(setImmediate);
  const finishing = t.sync.update(null);
  pending.resolve();
  await Promise.all([starting, finishing]);
  assert.equal(t.native(), null);
  assert.equal(t.applied.length, 0);
  assert.deepEqual(
    t.calls.map(([name]) => name),
    ["set", "clear"],
  );
});

test("obsolete native events cannot replace a new rest interval", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  await t.sync.update(snapshot({ id: "rest-2", endAt: 200_000 }));
  t.change(nativeState({ id: "rest-1", endAt: 130_000, version: 10 }));
  const applied = t.applied.length;
  await t.sync.refresh();
  assert.equal(t.applied.length, applied);
});

test("compare-and-set conflict accepts the newer native action", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  const set = t.adapter.setTimer;
  t.adapter.setTimer = async (...args) => {
    t.change(nativeState({ version: 2, endAt: 160_000 }));
    return set(...args);
  };
  await t.sync.update(snapshot({ endAt: 130_000 }));
  assert.equal(t.native().endAt, 160_000);
  assert.equal(t.applied.at(-1).endAt, 160_000);
});

test("failed native work can be retried without an automatic retry loop", async () => {
  let fail = true;
  const t = setup(null, async () => {
    if (fail) throw Error("native unavailable");
  });
  await t.sync.update(snapshot());
  assert.equal(t.failures.length, 1);
  assert.equal(t.calls.length, 0);
  fail = false;
  await t.sync.retry();
  assert.equal(t.calls.length, 1);
});

test("expiry reconciliation does not cancel the completed notification in the background", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  t.change(nativeState({ status: "complete", version: 2 }));
  await t.sync.refresh();
  await t.sync.update(snapshot());
  assert.equal(t.calls.length, 1);
  assert.equal(t.native().status, "complete");
});

test("retry republishes notifications after native state was saved but publishing failed", async () => {
  const t = setup();
  const set = t.adapter.setTimer;
  let fail = true;
  t.adapter.setTimer = async (...args) => {
    const result = await set(...args);
    if (fail) throw Error("notification publishing failed");
    return result;
  };
  await t.sync.update(snapshot());
  assert.equal(t.failures.length, 1);
  assert.equal(t.native().id, "rest-1");
  fail = false;
  await t.sync.retry();
  assert.equal(t.calls.length, 2);
});

test("retry adopts a newer native action before republishing", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  t.change(nativeState({ version: 2, endAt: 130_000 }));
  await t.sync.retry();
  assert.equal(t.calls.length, 2);
  assert.equal(t.native().endAt, 130_000);
});

test("retry preserves a completed alert instead of clearing or restarting it", async () => {
  const t = setup();
  await t.sync.update(snapshot());
  t.change(nativeState({ status: "complete", version: 2 }));
  await t.sync.refresh();
  await t.sync.retry();
  assert.equal(t.calls.length, 1);
  assert.equal(t.native().status, "complete");
});

test("invalid native payloads are rejected", () => {
  assert.equal(parseNativeTimer(null), null);
  assert.equal(parseNativeTimer("malformed"), null);
  assert.equal(parseNativeTimer('{"id":"old"}'), null);
  assert.equal(
    parseNativeTimer(JSON.stringify(nativeState({ endAt: null }))),
    null,
  );
});

const tickerModule = { exports: {} };
vm.runInThisContext(
  "(function(module,exports){" +
    ts.transpileModule(
      fs.readFileSync(
        require("node:path").join(
          __dirname,
          "../src/features/workout/utils/foregroundTicker.ts",
        ),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText +
    "})",
)(tickerModule, tickerModule.exports);
function tickerHarness(initial = "active") {
  let deferred,
    listener,
    ticks = new Set(),
    removed = false;
  const visibility = {
    currentState: initial,
    addEventListener: (_, fn) => {
      listener = fn;
      return {
        remove: () => {
          removed = true;
        },
      };
    },
  };
  return {
    visibility,
    scheduler: {
      everySecond(fn) {
        ticks.add(fn);
        return () => ticks.delete(fn);
      },
      nextTick(fn) {
        deferred = fn;
        return () => {
          deferred = null;
        };
      },
    },
    initial: () => {
      deferred?.();
      deferred = null;
    },
    tick: () => {
      for (const fn of [...ticks]) fn();
    },
    state: (state) => {
      visibility.currentState = state;
      listener(state);
    },
    intervals: () => ticks.size,
    removed: () => removed,
  };
}

test("background cancels all app ticks; foreground recalculates the countdown from its deadline", () => {
  const h = tickerHarness();
  let now = 0,
    remaining,
    updates = 0;
  const stop = tickerModule.exports.startForegroundTicker(
    h.visibility,
    () => {
      updates++;
      remaining = Math.max(0, 90 - now);
      return remaining > 0;
    },
    h.scheduler,
  );
  h.initial();
  assert.equal(h.intervals(), 1);
  h.state("background");
  now = 60;
  h.tick();
  assert.equal(updates, 1);
  assert.equal(h.intervals(), 0);
  h.state("active");
  assert.equal(remaining, 30);
  assert.equal(h.intervals(), 1);
  now = 90;
  h.tick();
  assert.equal(remaining, 0);
  assert.equal(h.intervals(), 0);
  stop();
  assert.equal(h.removed(), true);
});

test("starting in the background schedules no interval", () => {
  const h = tickerHarness("background");
  let updates = 0;
  const stop = tickerModule.exports.startForegroundTicker(
    h.visibility,
    () => {
      updates++;
      return true;
    },
    h.scheduler,
  );
  h.initial();
  h.tick();
  assert.equal(updates, 0);
  assert.equal(h.intervals(), 0);
  stop();
});

test("repeated foreground events never stack intervals, and inactive/cleanup stop them", () => {
  const h = tickerHarness();
  const stop = tickerModule.exports.startForegroundTicker(
    h.visibility,
    () => true,
    h.scheduler,
  );
  h.initial();
  h.state("active");
  h.state("active");
  assert.equal(h.intervals(), 1);
  h.state("inactive");
  assert.equal(h.intervals(), 0);
  h.state("active");
  stop();
  assert.equal(h.intervals(), 0);
});

test("paused or expired counters update once without a repeating timer", () => {
  const h = tickerHarness();
  let updates = 0;
  const stop = tickerModule.exports.startForegroundTicker(
    h.visibility,
    () => {
      updates++;
      return false;
    },
    h.scheduler,
  );
  h.initial();
  h.tick();
  assert.equal(updates, 1);
  assert.equal(h.intervals(), 0);
  stop();
});
