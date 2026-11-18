const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/features/workout/sync/WorkoutSyncProvider.tsx"),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("a lost cold-start response keeps the immutable workout queued until acknowledgement", async () => {
  const queued = { payload: { id: "workout", sets: [] }, error: null };
  let rows = [queued];
  let onNetwork;
  let onForeground;
  let retry;
  let scope = "login";
  const posts = [];
  const cleanups = [];
  class NetworkError extends Error {}
  const deps = {
    "@react-native-community/netinfo": {
      __esModule: true,
      default: { addEventListener(callback) { onNetwork = callback; return () => {}; } },
    },
    "@tanstack/react-query": { useQuery: () => ({ data: rows }) },
    react: {
      useRef: () => ({ current: null }),
      useEffect: (effect) => cleanups.push(effect()),
    },
    "react-native": {
      AppState: {
        currentState: "active",
        addEventListener(_event, callback) {
          onForeground = callback;
          return { remove() {} };
        },
      },
    },
    "@/features/auth/provider/AuthProvider": {
      useAuth: () => ({ status: "signedIn", accountId: "account" }),
    },
    "@/features/auth/store/tokenStore": {
      tokenStore: { getAccountId: () => "account", getSessionScope: () => scope },
    },
    "@/features/exercises/api/queryKeys": { exerciseKeys: {} },
    "@/shared/api/errors": { NetworkError, ApiError: class extends Error {} },
    "@/shared/api/queryClient": { queryClient: { invalidateQueries() {} } },
    "../api/queryKeys": { sessionKeys: { all: ["sessions"], queue: (id) => ["queue", id] } },
    "../api/session": {
      async uploadCompletedWorkout(payload) {
        posts.push(payload);
        if (posts.length === 1) throw new NetworkError();
        return { id: payload.id };
      },
    },
    "../storage/offlineWorkoutStorage": {
      offlineWorkoutStorage: {
        list: async () => rows,
        async remove(account, id) {
          assert.equal(account, "account");
          rows = rows.filter((row) => row.payload.id !== id);
        },
      },
    },
  };
  const entry = { exports: {} };
  new Function("module", "exports", "require", "setTimeout", "clearTimeout", code)(
    entry, entry.exports, (id) => deps[id],
    (callback) => { retry = callback; return 1; }, () => {},
  );
  entry.exports.WorkoutSyncProvider();
  onNetwork({ isConnected: true });
  await flush();
  assert.equal(posts.length, 1);
  assert.deepEqual(rows, [queued]);

  onForeground("active");
  await flush();
  assert.equal(posts.length, 1);
  retry();
  await flush();
  assert.deepEqual(posts, [queued.payload, queued.payload]);
  assert.deepEqual(rows, []);

  scope = "another-login";
  rows = [queued];
  onForeground("active");
  await flush();
  assert.equal(posts.length, 2);
  assert.deepEqual(rows, [queued]);
  cleanups.forEach((cleanup) => cleanup?.());
});
