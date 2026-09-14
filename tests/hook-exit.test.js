#!/usr/bin/env node
/**
 * Tests for hooks/scripts/lib/hook-exit.js
 *
 * Ported from open-gsd/gsd-core (MIT), hooks/lib/hook-exit.js. The idea and its
 * rationale are theirs; the implementation is adapted to this repo's exit
 * protocol.
 *
 * The problem it solves: every hook here ends its outer try/catch one of two
 * ways. Some `process.exit(0)` — fail open, because a hook's own bug must never
 * block a legitimate tool call. Others exit 2 — fail closed, because a hook
 * whose entire job is a safety denial must not let its own bug wave the denial
 * through.
 *
 * Both are correct, for DIFFERENT hooks. Neither is obviously correct. So a
 * helper with a default would let a future hook inherit the wrong policy by
 * saying nothing at all — the exact "nothing fails with success" defect worth
 * closing. Requiring the policy at the call site turns "I forgot to decide"
 * into a crash instead of a silent behaviour.
 */

'use strict';

const assert = require('assert');
const {
  HOOK_ON_CRASH,
  resolveCrashExit,
  describeCrash,
} = require('../hooks/scripts/lib/hook-exit.js');

const cases = [
  ['exposes exactly two policies, frozen', () => {
    assert.deepStrictEqual(Object.keys(HOOK_ON_CRASH).sort(), ['ALLOW', 'DENY']);
    assert(Object.isFrozen(HOOK_ON_CRASH), 'the enum must not be extendable at runtime');
  }],

  ['ALLOW resolves to exit 0, DENY to exit 2', () => {
    assert.strictEqual(resolveCrashExit(HOOK_ON_CRASH.ALLOW).code, 0);
    assert.strictEqual(resolveCrashExit(HOOK_ON_CRASH.DENY).code, 2);
  }],

  // The whole point of the module. An omitted policy must not silently become
  // one of the two real ones.
  ['an omitted policy is not silently treated as either', () => {
    for (const bad of [undefined, null, '']) {
      const resolved = resolveCrashExit(bad);
      assert.strictEqual(resolved.declared, false, `${JSON.stringify(bad)} must not read as declared`);
    }
  }],

  ['a typo\'d policy is not reinterpreted as allow or deny', () => {
    for (const typo of ['allowed', 'DENY ', 'block', 'open', 'true', 0, 1, {}]) {
      const resolved = resolveCrashExit(typo);
      assert.strictEqual(resolved.declared, false, `${JSON.stringify(typo)} must not read as declared`);
    }
  }],

  // resolveCrashExit must be TOTAL — never throw. Throwing would unwind into
  // the caller's own outer catch, which is precisely the fail-open-by-accident
  // hazard this module exists to remove.
  ['resolving is total and never throws', () => {
    for (const hostile of [undefined, null, {}, [], 0, NaN, Symbol('x'), () => {}]) {
      assert.doesNotThrow(() => resolveCrashExit(hostile), `threw on ${String(hostile)}`);
    }
  }],

  // An undeclared policy is a BUG IN THE HOOK, not a safety decision, so it
  // must be loud rather than quietly permissive. Exit 2 surfaces it: the
  // diagnostic reaches the model instead of vanishing.
  ['an undeclared policy surfaces loudly rather than passing silently', () => {
    const resolved = resolveCrashExit(undefined);
    assert.strictEqual(resolved.code, 2, 'a missing policy must not exit 0');
    assert(/declare/i.test(resolved.reason), 'the reason must say a policy was not declared');
  }],

  ['the diagnostic names the offending value so a typo is debuggable', () => {
    assert(describeCrash('allowed').includes('allowed'));
    assert(describeCrash(42).includes('42'));
  }],

  ['a declared policy carries no complaint', () => {
    assert.strictEqual(resolveCrashExit(HOOK_ON_CRASH.ALLOW).declared, true);
    assert.strictEqual(resolveCrashExit(HOOK_ON_CRASH.DENY).declared, true);
    assert.strictEqual(resolveCrashExit(HOOK_ON_CRASH.ALLOW).reason, null);
  }],
];

let passed = 0;
let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`  FAIL  ${name}\n        ${err.message}`);
    failed += 1;
  }
}
console.log(`\nhook-exit: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
