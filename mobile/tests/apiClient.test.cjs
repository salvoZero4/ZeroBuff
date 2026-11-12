const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

const clientCode = ts.transpileModule(
  readFileSync(join(__dirname, "../src/shared/api/client.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

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
