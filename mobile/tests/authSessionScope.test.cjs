const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function tokenStore(disk) {
  const code = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/features/auth/store/tokenStore.ts"),
      "utf8",
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    () => ({
      getItemAsync: async (key) => disk.get(key) ?? null,
      setItemAsync: async (key, value) => {
        disk.set(key, value);
      },
      deleteItemAsync: async (key) => {
        disk.delete(key);
      },
    }),
    mod,
    mod.exports,
  );
  return mod.exports.tokenStore;
}

test("existing logins get a stable local scope without a server request or token changes", async () => {
  const disk = new Map([
    ["access_token", "access"],
    ["refresh_token", "refresh"],
  ]);
  const old = tokenStore(disk);
  await old.load();
  const scope = old.getSessionScope();
  assert.equal(typeof scope, "string");
  assert.notEqual(scope, "refresh");
  const fresh = tokenStore(disk);
  await fresh.load();
  assert.equal(fresh.getSessionScope(), scope);
  await fresh.setAccess("new-access");
  assert.equal(fresh.getSessionScope(), scope);
  assert.equal(fresh.getRefresh(), "refresh");
});

test("logout clears the namespace and another explicit login receives a new scope", async () => {
  const disk = new Map();
  const store = tokenStore(disk);
  await store.setTokens("access-a", "refresh-a");
  const before = store.getSessionScope();
  await store.clear();
  assert.equal(store.getSessionScope(), null);
  assert.equal(disk.size, 0);
  await store.setTokens("access-b", "refresh-b");
  assert.notEqual(store.getSessionScope(), before);
  assert.equal(store.getAccess(), "access-b");
});
