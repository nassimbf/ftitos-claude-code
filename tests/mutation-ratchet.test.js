#!/usr/bin/env node
/**
 * Tests for scripts/ci/mutation-ratchet.js
 *
 * Why a ratchet and not a fixed threshold: a fixed number is either so low it
 * never fires or so high it blocks every commit, and both end the same way —
 * someone removes it. A ratchet only asks that the score not get WORSE, which
 * is enforceable from day one at whatever the current score happens to be.
 *
 * The denominator rule is the load-bearing part, and it is gsd-core's finding
 * (stryker.config.mjs:106): never gate on a score that excludes mutants with no
 * coverage. That denominator measures "of the code we bothered to test, how well
 * did we test it" — which goes UP when you delete a failing test or stop
 * covering a module. A test-quality gate that rewards deleting tests is worse
 * than no gate.
 */

'use strict';

const assert = require('assert');
const {
  parseMutmutResults,
  computeScore,
  checkRatchet,
} = require('../scripts/ci/mutation-ratchet.js');

const cases = [
  ['parses mutmut result counts', () => {
    const out = '🎉 12  ⏰ 1  🤔 2  🙁 5  🔇 0';
    const r = parseMutmutResults(out);
    assert.strictEqual(r.killed, 12);
    assert.strictEqual(r.timeout, 1);
    assert.strictEqual(r.suspicious, 2);
    assert.strictEqual(r.survived, 5);
    assert.strictEqual(r.skipped, 0);
  }],

  ['unparseable output is reported, not guessed at', () => {
    assert.strictEqual(parseMutmutResults('command not found'), null);
    assert.strictEqual(parseMutmutResults(''), null);
  }],

  // A timeout means the mutant changed behaviour enough to hang the suite, which
  // is a kill. Suspicious is ambiguous and counted against us — the conservative
  // direction for a quality gate.
  ['a timeout counts as killed, suspicious counts against', () => {
    const score = computeScore({ killed: 8, timeout: 2, suspicious: 0, survived: 0, skipped: 0 });
    assert.strictEqual(score, 100, 'timeouts are kills');

    const withSuspicious = computeScore({ killed: 8, timeout: 0, suspicious: 2, survived: 0, skipped: 0 });
    assert(withSuspicious < 100, 'suspicious must not be counted as a kill');
  }],

  // THE rule. Skipped mutants are ones no test covered. Excluding them from the
  // denominator means uncovered code raises the score.
  ['skipped mutants stay in the denominator', () => {
    const covered = { killed: 10, timeout: 0, suspicious: 0, survived: 0, skipped: 0 };
    const halfUncovered = { killed: 10, timeout: 0, suspicious: 0, survived: 0, skipped: 10 };

    assert.strictEqual(computeScore(covered), 100);
    assert.strictEqual(
      computeScore(halfUncovered), 50,
      'ten uncovered mutants must halve the score, not be ignored'
    );
  }],

  ['deleting the tests that cover a module cannot raise the score', () => {
    const before = computeScore({ killed: 6, timeout: 0, suspicious: 0, survived: 4, skipped: 0 });
    // "Fix" the 4 survivors by deleting their tests: they become uncovered.
    const after = computeScore({ killed: 6, timeout: 0, suspicious: 0, survived: 0, skipped: 4 });
    assert(after <= before, `deleting coverage raised the score ${before} -> ${after}`);
  }],

  ['an empty run scores zero rather than dividing by zero', () => {
    assert.strictEqual(computeScore({ killed: 0, timeout: 0, suspicious: 0, survived: 0, skipped: 0 }), 0);
  }],

  ['the ratchet passes when the score holds or improves', () => {
    assert.strictEqual(checkRatchet(72, 72).ok, true, 'equal must pass');
    assert.strictEqual(checkRatchet(80, 72).ok, true, 'better must pass');
  }],

  ['the ratchet fails when the score regresses', () => {
    const r = checkRatchet(64, 72);
    assert.strictEqual(r.ok, false);
    assert(/72/.test(r.reason) && /64/.test(r.reason), 'the reason must name both numbers');
  }],

  // Floating-point noise should not fail a build. A real regression is not 0.01%.
  ['a trivial rounding difference does not fail the build', () => {
    assert.strictEqual(checkRatchet(71.999, 72).ok, true, 'sub-0.1 noise must not fail');
    assert.strictEqual(checkRatchet(71.5, 72).ok, false, 'a real half-point drop must fail');
  }],

  ['a missing baseline records rather than fails', () => {
    const r = checkRatchet(55, null);
    assert.strictEqual(r.ok, true, 'first run must not fail — there is nothing to regress from');
    assert(/record/i.test(r.reason), 'it must say it is recording a baseline');
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
console.log(`\nmutation-ratchet: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
