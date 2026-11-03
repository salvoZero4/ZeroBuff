const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function picker() {
  const file = path.join(
    __dirname,
    "../src/features/exercises/store/exercisePickerStore.ts",
  );
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(require, mod, mod.exports);
  return mod.exports;
}
const exercise = {
  id: "row",
  name: "Row",
  muscle_group: "upper_back",
  equipment: "barbell",
};

test("selection is consumed before callback execution and double taps cannot deliver twice", () => {
  const p = picker();
  const selected = [];
  p.openExercisePicker((value) => {
    assert.equal(p.exercisePickerStore.getState().onSelect, null);
    selected.push(value);
    p.selectExercise(value);
  });
  p.selectExercise(exercise);
  p.selectExercise(exercise);
  assert.deepEqual(selected, [exercise]);
});

test("opening another picker replaces the previous recipient", () => {
  const p = picker();
  const selected = [];
  p.openExercisePicker(() => assert.fail("old recipient"));
  p.openExercisePicker((value) => selected.push(value));
  p.selectExercise(exercise);
  assert.deepEqual(selected, [exercise]);
});

test("cancellation discards the pending callback without persisting any selection", () => {
  const p = picker();
  p.openExercisePicker(() => assert.fail("cancelled recipient"));
  p.clearExercisePicker();
  p.selectExercise(exercise);
  assert.equal(p.exercisePickerStore.getState().onSelect, null);
});

test("a throwing callback cannot remain pending or be invoked again", () => {
  const p = picker();
  p.openExercisePicker(() => {
    throw new Error("Recipient failed");
  });
  assert.throws(() => p.selectExercise(exercise), /Recipient failed/);
  assert.equal(p.exercisePickerStore.getState().onSelect, null);
  assert.doesNotThrow(() => p.selectExercise(exercise));
});

test("a callback can register a new picker without the previous selection clearing it", () => {
  const p = picker();
  const selected = [];
  p.openExercisePicker(() =>
    p.openExercisePicker((value) => selected.push(value)),
  );
  p.selectExercise(exercise);
  assert.notEqual(p.exercisePickerStore.getState().onSelect, null);
  p.selectExercise(exercise);
  assert.deepEqual(selected, [exercise]);
});
