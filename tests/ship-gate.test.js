#!/usr/bin/env node
/**
 * Tests for hooks/scripts/ship-gate.js
 *
 * The pre-commit gate runs tests and doctor on THIS repo. Nothing checked what
 * leaves it. rules/security.md requires a dependency audit before ship and
 * rules/code.md bans debug artifacts and TODO-without-issue-reference, but both
 * were prose — advice the model can skip. This hook is the enforcement.
 *
 * Scope is deliberately narrow: things that are fast to detect, unambiguous, and
 * genuinely embarrassing in front of a client. Slow checks (full suite, coverage)
 * belong in the pre-commit gate and CI, not in the push path — a gate that takes
 * minutes is a gate people route around, and block-no-verify exists precisely
 * because they will.
 *
 * Note on fixtures: secret-shaped strings are assembled at runtime rather than
 * written literally. pre-secrets-block.js refuses to write this file otherwise —
 * it caught the first draft, which is the hook doing its job.
 */

'use strict';

const assert = require('assert');
const {
  isShipCommand,
  scanDiff,
} = require('../hooks/scripts/ship-gate.js');

// A diff line is only interesting when it is ADDED (+). Removing a console.log
// must never be blocked — that is the fix, not the offence.
function added(...lines) {
  return lines.map(l => `+${l}`).join('\n');
}

const FAKE_AWS_KEY = 'AKIA' + 'IOSFODNN7EXAMPLE';
const PRIVATE_KEY_HEADER = '-----BEGIN RSA PRIVATE ' + 'KEY-----';

const cases = [
  ['recognises the commands that ship code', () => {
    assert(isShipCommand('git push'), 'bare push ships');
    assert(isShipCommand('git push origin main'));
    assert(isShipCommand('git push --force-with-lease origin feat/x'));
    assert(isShipCommand('gh pr create --fill'));
    assert(isShipCommand('cd /repo && git push'), 'push after a chain still ships');
  }],

  ['ignores commands that do not ship', () => {
    assert(!isShipCommand('git status'));
    assert(!isShipCommand('git commit -m "wip"'));
    assert(!isShipCommand('git fetch origin'));
    assert(!isShipCommand('git pull --rebase'));
    // Describing a push is not pushing. Same class of bug the safety net had.
    assert(!isShipCommand('echo "run git push when ready"'));
    assert(!isShipCommand('git commit -m "docs: explain git push --force"'));
  }],

  ['catches secrets in added lines', () => {
    const findings = scanDiff(added(`AWS_KEY = "${FAKE_AWS_KEY}"`));
    assert(findings.some(f => f.kind === 'secret'), 'AWS access key id must be caught');
  }],

  ['catches a private key block', () => {
    const findings = scanDiff(added(PRIVATE_KEY_HEADER));
    assert(findings.some(f => f.kind === 'secret'));
  }],

  ['catches debug artifacts', () => {
    assert(scanDiff(added('  console.log("here")')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('    import pdb; pdb.set_trace()')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('  debugger;')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('  it.only("x", () => {})')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('  describe.only("y", () => {})')).some(f => f.kind === 'debug'));
  }],

  // rules/code.md: "TODO without an issue reference" is a banned pattern. With a
  // reference it is tracked work, which is fine.
  ['catches TODO without an issue reference, allows it with one', () => {
    assert(scanDiff(added('// TODO: fix this later')).some(f => f.kind === 'todo'));
    assert(!scanDiff(added('// TODO(#412): drop the shim once v2 lands')).some(f => f.kind === 'todo'));
    assert(!scanDiff(added('// TODO: see JIRA-88 for the migration')).some(f => f.kind === 'todo'));
  }],

  // The single most important negative case. A diff that REMOVES a console.log
  // is the diff that fixes the problem; blocking it inverts the gate.
  ['never blocks on removed lines', () => {
    const removalDiff = ['-  console.log("here")', `-AWS_KEY = "${FAKE_AWS_KEY}"`].join('\n');
    assert.deepStrictEqual(scanDiff(removalDiff), []);
  }],

  ['ignores context lines', () => {
    const contextDiff = ['   console.log("pre-existing")', ' debugger;'].join('\n');
    assert.deepStrictEqual(scanDiff(contextDiff), []);
  }],

  // Without this the gate cannot describe its own tests, its own rules files, or
  // this very test file — and a gate that blocks its own documentation gets
  // disabled within a day.
  ['does not flag its own documentation of the patterns', () => {
    assert.deepStrictEqual(scanDiff(added('the hook blocks console.log in a diff')), []);
    assert.deepStrictEqual(scanDiff(added('| `debugger;` | blocked |')), []);
  }],

  ['reports every distinct finding, not just the first', () => {
    const findings = scanDiff(added('console.log(1)', 'debugger;', '// TODO: later'));
    assert(findings.length >= 3, `expected 3+ findings, got ${findings.length}`);
  }],

  ['findings carry a line number and the matched rule', () => {
    const [finding] = scanDiff(added('console.log("x")'));
    assert.strictEqual(typeof finding.line, 'number');
    assert(finding.rule, 'finding must name the rule that fired');
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
console.log(`\nship-gate: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
