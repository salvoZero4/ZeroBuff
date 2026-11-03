const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { QueryClient } = require("@tanstack/react-query");

function keys(feature, name) {
  const file = path.join(__dirname, `../src/features/${feature}/api/queryKeys.ts`);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", code)(mod, mod.exports);
  return mod.exports[name];
}
const sessionKeys = keys("workout", "sessionKeys");
const routineKeys = keys("routines", "routineKeys");
const exerciseKeys = keys("exercises", "exerciseKeys");
const scheduleKeys = keys("schedule", "scheduleKeys");
const weightKeys = keys("weight", "weightKeys");
const userKeys = keys("profile", "userKeys");

function client() {
  return new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
}

test("session pagination has isolated caches and a shared list invalidation prefix", async () => {
  const cache = client();
  const home = sessionKeys.list({ limit: 64 });
  const analytics = sessionKeys.list({ limit: 50 });
  const detail = sessionKeys.detail("s1");
  cache.setQueryData(home, ["home"]);
  cache.setQueryData(analytics, ["analytics"]);
  cache.setQueryData(detail, { sets: [] });
  assert.deepEqual(cache.getQueryData(home), ["home"]);
  assert.deepEqual(cache.getQueryData(analytics), ["analytics"]);
  await cache.invalidateQueries({ queryKey: sessionKeys.lists() });
  assert.equal(cache.getQueryState(home).isInvalidated, true);
  assert.equal(cache.getQueryState(analytics).isInvalidated, true);
  assert.equal(cache.getQueryState(detail).isInvalidated, false);
  cache.clear();
});

test("resource invalidation covers descendants while leaving unrelated resources fresh", async () => {
  const cache = client();
  const groups = [
    [routineKeys.all, [routineKeys.list(), routineKeys.detail("r1")]],
    [scheduleKeys.all, [scheduleKeys.list(), scheduleKeys.today()]],
    [weightKeys.all, [weightKeys.today("2026-11-03"), weightKeys.today("2026-11-04"), weightKeys.list({ date_from: "2026-11-01" })]],
    [exerciseKeys.all, [exerciseKeys.infiniteList({ name: "row", limit: 50 }), exerciseKeys.stats("e1")]],
    [userKeys.all, [userKeys.me()]],
    [sessionKeys.all, [sessionKeys.list(), sessionKeys.detail("s1")]],
  ];
  for (const [, children] of groups) for (const key of children) cache.setQueryData(key, {});
  for (const [root, children] of groups) {
    await cache.invalidateQueries({ queryKey: root });
    for (const key of children) assert.equal(cache.getQueryState(key).isInvalidated, true);
    for (const [otherRoot, otherChildren] of groups) {
      if (otherRoot === root) continue;
      for (const key of otherChildren) assert.equal(cache.getQueryState(key).isInvalidated, false);
    }
    for (const key of children) cache.setQueryData(key, {});
  }
  cache.clear();
});

test("exercise filters are isolated and list refresh does not invalidate workout stats", async () => {
  const cache = client();
  const rows = exerciseKeys.infiniteList({ name: "row", limit: 50 });
  const presses = exerciseKeys.infiniteList({ name: "press", limit: 50 });
  const stats = exerciseKeys.stats("e1");
  cache.setQueryData(rows, { pages: [["row"]], pageParams: [0] });
  cache.setQueryData(presses, { pages: [["press"]], pageParams: [0] });
  cache.setQueryData(stats, { sessions: [] });
  assert.deepEqual(cache.getQueryData(rows).pages, [["row"]]);
  await cache.invalidateQueries({ queryKey: exerciseKeys.infiniteLists() });
  assert.equal(cache.getQueryState(rows).isInvalidated, true);
  assert.equal(cache.getQueryState(presses).isInvalidated, true);
  assert.equal(cache.getQueryState(stats).isInvalidated, false);
  cache.clear();
});
