const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function setup(stubs = {}) {
  const cache = new Map();
  function load(name) {
    if (name in stubs) return stubs[name];
    if (cache.has(name)) return cache.get(name).exports;
    const file = path.resolve(__dirname, "../src", name.replace(/^@\//, "") + ".ts");
    const mod = { exports: {} }; cache.set(name, mod);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency => load(dependency.startsWith(".") ? path.posix.join(path.posix.dirname(name), dependency) : dependency), mod, mod.exports);
    return mod.exports;
  }
  return load;
}
const progress = setup()("@/features/analytics/utils/progress");
const valid = { weight: "82,5", reps: "8", rir: "", set_number: "1" };
test("set input preserves decimal comma, bodyweight zero and unknown RIR", () => {
  assert.deepEqual(progress.parseSet(valid), { weight: 82.5, reps: 8, rir: null, set_number: 1 });
  assert.deepEqual(progress.parseSet({ ...valid, weight: "0", rir: "0" }), { weight: 0, reps: 8, rir: 0, set_number: 1 });
});
test("invalid inputs never become partially parsed training measurements", () => {
  for (const [key, values] of Object.entries({ weight: ["", "-1", "2kg", "NaN", "1,2,3"], reps: ["0", "2.5", "-1"], rir: ["11", "-1", "1.5", "n/a"], set_number: ["0", "1.5"] })) {
    for (const value of values) assert.throws(() => progress.parseSet({ ...valid, [key]: value }), Error, `${key}=${value}`);
  }
});
test("period boundaries clamp month ends and use local dates", () => {
  assert.equal(progress.periodStart("1M", new Date(2026, 2, 31, 23, 30)), "2026-02-28");
  assert.equal(progress.periodStart("3M", new Date(2026, 0, 31)), "2025-10-31");
  assert.equal(progress.periodStart("All"), "");
});
test("metrics use actual sets and label estimated strength separately", () => {
  const sets = [{ weight: 80, reps: 6 }, { weight: 70, reps: 10 }];
  assert.equal(progress.metricValue(sets, "Load"), 80);
  assert.equal(progress.metricValue(sets, "Reps"), 10);
  assert.equal(progress.metricValue(sets, "Volume"), 1180);
  assert.equal(progress.metricValue(sets, "Est. 1RM"), 96);
  assert.equal(progress.metricValue([{ weight: 0, reps: 14 }], "Reps"), 14);
});
test("two sessions on the same date follow their start time, not UUID order", () => {
  const points = progress.exercisePoints([
    { session_id: "a", date: "2026-11-03", started_at: "2026-11-03T18:00:00Z", sets: [{ weight: 90, reps: 5 }] },
    { session_id: "z", date: "2026-11-03", started_at: "2026-11-03T09:00:00Z", sets: [{ weight: 80, reps: 5 }] },
  ], "Load", "All");
  assert.deepEqual(points.map(p => p.id), ["z", "a"]);
  assert.deepEqual(progress.chartGeometry(points, 200, 100).points.map(p => p.x), [0, 200]);
});
test("weekly averages use Monday through Sunday across year boundaries and skip empty weeks", () => {
  const points = [
    { id: "1", date: "2026-01-05", value: 79 },
    { id: "2", date: "2026-01-04", value: 82 },
    { id: "3", date: "2025-12-31", value: 80 },
    { id: "4", date: "2026-01-19", value: 78 },
  ];
  assert.deepEqual(progress.weeklyWeightAverages(points), [
    { id: "2025-12-29", date: "2025-12-29", endDate: "2026-01-04", value: 81, count: 2 },
    { id: "2026-01-05", date: "2026-01-05", endDate: "2026-01-11", value: 79, count: 1 },
    { id: "2026-01-19", date: "2026-01-19", endDate: "2026-01-25", value: 78, count: 1 },
  ]);
});
test("single and constant measurements produce finite chart coordinates", () => {
  for (const points of [[{ id: "1", date: "2026-11-01", value: 80 }], [{ id: "1", date: "2026-11-01", value: 0 }, { id: "2", date: "2026-11-02", value: 0 }]]) {
    const graph = progress.chartGeometry(points, 200, 160);
    assert.ok(graph.max > graph.min);
    graph.points.forEach(p => { assert.ok(Number.isFinite(p.x)); assert.ok(Number.isFinite(p.y)); });
  }
  assert.deepEqual(progress.chartGeometry([], 200, 160).points, []);
});
test("weight dates reject impossible and future dates without timezone drift", () => {
  const now = new Date(2026, 10, 3, 0, 15);
  assert.deepEqual(progress.parseWeight("78,25", "2026-11-03", now), { weight: 78.25, date: "2026-11-03" });
  for (const date of ["2026-02-30", "2026-11-04", "03/11/2026", "2026-2-3"]) assert.throws(() => progress.parseWeight("80", date, now));
  for (const value of ["0", "501", "80kg"]) assert.throws(() => progress.parseWeight(value, "2026-11-03", now));
});
function apiSetup(request) { return setup({ "@/shared/api/client": { apiRequest: request } })("@/features/analytics/api/analytics"); }
test("history retrieves every page, including beyond the old 50-session cap", async () => {
  const calls = [];
  const api = apiSetup(async url => { calls.push(url); const offset = Number(new URL(url, "http://local").searchParams.get("offset")); return Array.from({ length: offset < 200 ? 100 : 7 }, (_, i) => ({ id: offset + i })); });
  const history = await api.getSessionHistory();
  assert.equal(history.length, 207); assert.equal(history.at(-1).id, 206); assert.equal(calls.length, 3);
});
test("page failure fails the history rather than presenting a partial total", async () => {
  const api = apiSetup(async url => { if (url.includes("offset=100")) throw new Error("offline"); return Array.from({ length: 100 }, (_, id) => ({ id })); });
  await assert.rejects(api.getSessionHistory(), /offline/);
});
test("editing a completed session sends set ID, decimal load and explicit null RIR", async () => {
  const calls = [];
  const api = apiSetup(async (url, options) => { calls.push([url, options]); return { id: "set-1" }; });
  await api.saveSessionSet("session-1", "exercise-1", "set-1", valid, [{ id: "set-1", exercise_id: "exercise-1", set_number: 1 }]);
  assert.equal(calls[0][0], "/session/session-1/log/set-1");
  assert.equal(calls[0][1].method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0][1].body), { weight: 82.5, reps: 8, rir: null, set_number: 1 });
});
test("adding an exercise uses its ID and does not alter the routine", async () => {
  const calls = [];
  const api = apiSetup(async (url, options) => { calls.push([url, options]); return { id: "new" }; });
  await api.saveSessionSet("session-1", "exercise-new", undefined, valid, []);
  assert.equal(calls.length, 1); assert.equal(calls[0][0], "/session/session-1/log/exercise-new"); assert.equal(calls[0][1].method, "POST");
});
test("duplicate numbering and invalid sets cannot reach the server", async () => {
  let calls = 0; const api = apiSetup(async () => { calls++; });
  await assert.rejects(api.saveSessionSet("session", "exercise", undefined, valid, [{ id: "existing", exercise_id: "exercise", set_number: 1 }]), /already exists/);
  await assert.rejects(api.saveSessionSet("session", "exercise", undefined, { ...valid, rir: "11" }, []), /RIR/);
  assert.equal(calls, 0);
});
test("exercise analytics excludes ongoing sessions and attaches exact timestamps", async () => {
  const api = apiSetup(async url => url.startsWith("/exercises") ? { sessions: [{ session_id: "done", date: "2026-11-03", sets: [] }, { session_id: "active", date: "2026-11-03", sets: [] }] } : [{ id: "done", status: "completed", started_at: "2026-11-03T09:00:00Z" }, { id: "active", status: "ongoing", started_at: "2026-11-03T18:00:00Z" }]);
  const result = await api.getExerciseHistory("exercise");
  assert.equal(result.length, 1); assert.equal(result[0].session_id, "done"); assert.equal(result[0].started_at, "2026-11-03T09:00:00Z");
});

test("logged exercises include only saved sets in completed sessions, deduplicate and sort", async () => {
  const visited = [];
  const load = setup({
    "@/features/workout/api/session": {
      getSessions: async () => [{ id: "a", status: "completed" }, { id: "b", status: "ongoing" }, { id: "c", status: "completed" }],
      getSessionDetails: async id => {
        visited.push(id);
        return { sets: id === "a" ? [{ exercise_id: "2", exercise_name: "Squat" }, { exercise_id: "1", exercise_name: "Bench" }] : [{ exercise_id: "2", exercise_name: "Squat" }] };
      },
    },
    "@/features/routines/api/routines": {},
    "@/features/exercises/api/exercise": {},
    "@/shared/api/client": {},
  });
  const result = await load("@/features/analytics/api/analytics").getLoggedExercises();
  assert.deepEqual(result, [{ id: "1", name: "Bench" }, { id: "2", name: "Squat" }]);
  assert.deepEqual(visited, ["a", "c"]);
});

test("logged exercises fail on missing history details rather than showing a partial list", async () => {
  const load = setup({
    "@/features/workout/api/session": {
      getSessions: async () => [{ id: "a", status: "completed" }],
      getSessionDetails: async () => { throw new Error("Unavailable"); },
    },
    "@/features/routines/api/routines": {},
    "@/features/exercises/api/exercise": {},
    "@/shared/api/client": {},
  });
  await assert.rejects(load("@/features/analytics/api/analytics").getLoggedExercises(), /Unavailable/);
});

test("date selection clamps short months, leap years and future dates", () => {
  const { changeDatePart } = setup()("@/shared/utils/dates");
  assert.equal(changeDatePart("2026-01-31", "month", 2, "2026-11-04"), "2026-02-28");
  assert.equal(changeDatePart("2024-02-29", "year", 2025, "2026-11-04"), "2025-02-28");
  assert.equal(changeDatePart("2026-10-31", "month", 11, "2026-11-04"), "2026-11-04");
  assert.equal(changeDatePart("2024-01-31", "month", 2, "2026-11-04"), "2024-02-29");
});
