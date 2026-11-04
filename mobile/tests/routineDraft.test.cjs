const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/features/routines/utils/routineDraft.ts'), 'utf8');
const mod = { exports: {} };
vm.runInThisContext(`(function(exports){${ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText}\n})`)(mod.exports);
const { routineDraftSignature: signature, toRoutinePayload } = mod.exports;
const row = { id: 'row-a', exercise_id: 'a', name: 'Squat', sets: '3', reps: '10', restSeconds: '90' };
const original = { name: 'Leg day', exercises: [row, { ...row, id: 'row-b', exercise_id: 'b' }] };

test('draft protection detects all editable fields, removal, addition and drag order', () => {
  const baseline = signature(original);
  assert.notEqual(signature({ ...original, name: 'Leg day 2' }), baseline);
  for (const field of ['sets', 'reps', 'restSeconds']) {
    assert.notEqual(signature({ ...original, exercises: [{ ...row, [field]: '' }, original.exercises[1]] }), baseline);
  }
  assert.notEqual(signature({ ...original, exercises: [...original.exercises].reverse() }), baseline);
  assert.notEqual(signature({ ...original, exercises: [row] }), baseline);
  assert.notEqual(signature({ ...original, exercises: [...original.exercises, row] }), baseline);
});
test('restoring the original values and order removes the unsaved warning', () => {
  assert.equal(signature(structuredClone(original)), signature(original));
  assert.equal(signature({ ...original, exercises: original.exercises.map(r => ({ ...r, id: 'different-row-id' })) }), signature(original));
  const reversedTwice = [...original.exercises].reverse().reverse();
  assert.equal(signature({ ...original, exercises: reversedTwice }), signature(original));
});
test('drag order is saved with contiguous order indices', () => {
  const payload = toRoutinePayload({ ...original, exercises: [...original.exercises].reverse() });
  assert.deepEqual(payload.exercises.map(e => [e.exercise_id, e.order_index]), [['b', 0], ['a', 1]]);
});

test('bulk rest changes only recovery, preserves order, stays local and marks draft dirty', () => {
  const before = structuredClone(original);
  const updated = mod.exports.withRestForAll(original, 135);
  assert.deepEqual(original, before);
  assert.deepEqual(updated.exercises.map(e => e.restSeconds), ['135', '135']);
  assert.deepEqual(updated.exercises.map(e => [e.exercise_id, e.sets, e.reps]), original.exercises.map(e => [e.exercise_id, e.sets, e.reps]));
  assert.notEqual(signature(updated), signature(original));
  assert.deepEqual(toRoutinePayload(updated).exercises.map(e => e.rest_time), [135, 135]);
  const overridden = { ...updated, exercises: [{ ...updated.exercises[0], restSeconds: '0' }, updated.exercises[1]] };
  assert.deepEqual(toRoutinePayload(overridden).exercises.map(e => e.rest_time), [0, 135]);
});

const durationModule = { exports: {} };
const durationSource = fs.readFileSync(path.join(__dirname, '../src/features/routines/utils/restDuration.ts'), 'utf8');
vm.runInThisContext(`(function(exports){${ts.transpileModule(durationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText}\n})`)(durationModule.exports);
const { parseRestDuration, formatRestDuration } = durationModule.exports;
test('rest minutes and seconds round trip without losing exact stored seconds', () => {
  for (const total of [0, 45, 60, 90, 135, 600, 3600]) {
    assert.equal(parseRestDuration(String(Math.floor(total / 60)), String(total % 60)), total);
  }
  assert.equal(formatRestDuration(135), '2:15');
  assert.equal(formatRestDuration(0), '0:00');
});
test('rest duration rejects negative, fractional, malformed and out-of-range seconds', () => {
  for (const [minutes, seconds] of [['-1', '0'], ['1.5', '0'], ['1', '60'], ['1', 'abc'], ['', '30'], ['1', '-1']]) {
    assert.throws(() => parseRestDuration(minutes, seconds));
  }
});

test('new exercises inherit the last bulk rest while individual overrides stay independent', () => {
  let state;
  const ref = { current: undefined };
  const react = {
    useState: init => { if (state === undefined) state = typeof init === 'function' ? init() : init; return [state, next => { state = typeof next === 'function' ? next(state) : next; }]; },
    useRef: init => { if (ref.current === undefined) ref.current = init; return ref; },
  };
  const hookModule = { exports: {} };
  const hookSource = fs.readFileSync(path.join(__dirname, '../src/features/routines/hooks/useRoutineDraft.ts'), 'utf8');
  vm.runInThisContext(`(function(require,exports){${ts.transpileModule(hookSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText}\n})`)(name => name === 'react' ? react : mod.exports, hookModule.exports);
  const hook = () => hookModule.exports.useRoutineDraft(undefined);
  hook().setRestForAll(135);
  hook().addExercise({ id: 'first', name: 'Squat' });
  const rowId = hook().draft.exercises[0].id;
  hook().updateExercise(rowId, { restSeconds: '45' });
  hook().addExercise({ id: 'second', name: 'Press' });
  assert.deepEqual(hook().draft.exercises.map(e => e.restSeconds), ['45', '135']);
});
