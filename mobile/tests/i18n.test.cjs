const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const file = path.join(__dirname, "../src/shared/i18n/i18n.ts");
const en = require("../src/shared/i18n/en.json");
const it = require("../src/shared/i18n/it.json");

function loadI18n() {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    createRequire(file),
    mod,
    mod.exports,
  );
  return mod.exports;
}

test("Italian and English catalogs cover the same keys and interpolation variables", () => {
  assert.deepEqual(Object.keys(it).sort(), Object.keys(en).sort());
  const placeholders = (text) =>
    [...text.matchAll(/\{\{(\w+)\}\}/g)].map(([, name]) => name).sort();
  for (const key of Object.keys(en)) {
    assert.ok(it[key].trim(), key);
    assert.deepEqual(placeholders(it[key]), placeholders(en[key]), key);
  }
});

test("switching the app locale updates plurals and numeric formatting", async () => {
  const { i18n, translate, numberLabel } = loadI18n();
  assert.equal(translate("exerciseCount", { count: 1 }), "1 exercise");
  await i18n.changeLanguage("it");
  assert.equal(translate("exerciseCount", { count: 2 }), "2 esercizi");
  assert.equal(translate("exercise.smith_machine"), "Multipower");
  assert.equal(numberLabel(82.5), "82,5");
  await i18n.changeLanguage("en");
  assert.equal(numberLabel(82.5), "82.5");
});
