const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const filename = path.join(__dirname, "../src/features/auth/utils/registrationPassword.ts");
const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const exportsObject = {};
new Function("exports", outputText)(exportsObject);
const { getRegistrationPasswordError } = exportsObject;

test("registration reports the first missing rule in backend order", () => {
  assert.match(getRegistrationPasswordError("A2b💪💪💪💪"), /8 characters/);
  assert.match(getRegistrationPasswordError("longpassword"), /digit/);
  assert.match(getRegistrationPasswordError("longpassword1"), /uppercase/);
  assert.match(getRegistrationPasswordError("LONGPASSWORD1"), /lowercase/);
  assert.equal(getRegistrationPasswordError("LongPassword1"), undefined);
});

test("registration accepts Unicode case and digit characters", () => {
  for (const password of ["Éà💪💪💪💪💪٢", "Éà💪💪💪💪💪²"])
    assert.equal(getRegistrationPasswordError(password), undefined);
  assert.match(getRegistrationPasswordError("Éà💪💪💪💪💪½"), /digit/);
});
