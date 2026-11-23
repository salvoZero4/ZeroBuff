const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

function transpile(source) {
  return ts.transpileModule(
    readFileSync(join(__dirname, "../src", source), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
}

const clientCode = transpile("shared/api/client.ts");

for (const [configuredUrl, backendUrl] of [
  [undefined, "http://localhost:8000"],
  ["https://api.example.com/", "https://api.example.com"],
  ["https://api.example.com/v1/", "https://api.example.com"],
]) {
  test(`API requests and refresh use one version prefix with ${configuredUrl ?? "the default URL"}`, async () => {
    const requests = [];
    let access = "expired";
    const tokenStore = {
      getAccess: () => access,
      getRefresh: () => "refresh",
      setAccess: async (token) => {
        access = token;
      },
    };
    const fetch = async (url) => {
      requests.push(url);
      if (requests.length === 1) return new Response(null, { status: 401 });
      if (requests.length === 2) return Response.json({ access_token: "new" });
      return new Response(null, { status: 204 });
    };
    const exports = {};
    const loadClient = new Function(
      "require", "exports", "process", "fetch", clientCode,
    );
    loadClient(
      () => ({ tokenStore }),
      exports,
      { env: { EXPO_PUBLIC_API_URL: configuredUrl } },
      fetch,
    );

    await exports.apiRequest("/weight/today?day=2026-11-12");

    const endpoint = `${backendUrl}/v1/weight/today?day=2026-11-12`;
    assert.deepEqual(requests, [endpoint, `${backendUrl}/v1/auth/refresh`, endpoint]);
  });
}

test("a catalog conflict preserves the existing exercise for reuse", async () => {
  const errors = {};
  new Function("exports", transpile("shared/api/errors.ts"))(errors);
  const existing = {
    id: "441dfa84-88ea-4bc4-a236-d6858143d144",
    name: "Bench Press",
    equipment: "barbell",
    muscle_group: "chest",
  };

  const client = {};
  new Function("require", "exports", "process", "fetch", clientCode)(
    (path) => path === "./errors"
      ? errors
      : { tokenStore: { getAccess: () => "test" } },
    client,
    { env: {} },
    async () => Response.json(
      { detail: "An exercise with a similar name already exists: Bench Press", matches: [existing] },
      { status: 409 },
    ),
  );

  const exercises = {};
  new Function("require", "exports", transpile("features/exercises/api/exercise.ts"))(
    (path) => path.endsWith("/errors") ? errors : client,
    exercises,
  );
  await assert.rejects(
    exercises.createExercise({
      name: "Bench-Press",
      equipment: "barbell",
      muscle_group: "chest",
    }),
    (error) => {
      assert.equal(error.status, 409);
      assert.match(error.message, /Bench Press/);
      assert.deepEqual(exercises.getExerciseNameMatches(error), [existing]);
      return true;
    },
  );
});
