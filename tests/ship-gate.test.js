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
  manifestsInDiff,
  parseNpmAudit,
  parsePipAudit,
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

  // --- dependency audit -------------------------------------------------
  //
  // rules/security.md: "no known critical CVEs in direct dependencies
  // (npm audit / pip-audit before ship)". That was prose. The audit itself is
  // slow — seconds for npm, longer for pip — so it runs ONLY when the outgoing
  // diff actually touches a manifest. Most pushes do not, which keeps the
  // common path fast; a gate that always costs seconds is a gate people route
  // around, same reasoning as leaving the test suite out.

  ['detects which ecosystems need auditing from the diff', () => {
    const npmDiff = 'diff --git a/package.json b/package.json\n+++ b/package.json';
    assert.deepStrictEqual(manifestsInDiff(npmDiff), ['npm']);

    const pyDiff = 'diff --git a/requirements.txt b/requirements.txt\n+++ b/requirements.txt';
    assert.deepStrictEqual(manifestsInDiff(pyDiff), ['pip']);

    const lockDiff = 'diff --git a/package-lock.json b/package-lock.json';
    assert.deepStrictEqual(manifestsInDiff(lockDiff), ['npm']);

    for (const f of ['pyproject.toml', 'uv.lock', 'Pipfile']) {
      assert.deepStrictEqual(manifestsInDiff(`diff --git a/${f} b/${f}`), ['pip'], f);
    }
  }],

  ['a diff with no manifest changes triggers no audit', () => {
    const diff = 'diff --git a/src/app.ts b/src/app.ts\n+const x = 1;';
    assert.deepStrictEqual(manifestsInDiff(diff), []);
  }],

  ['reports both ecosystems when both manifests move', () => {
    const diff = [
      'diff --git a/package.json b/package.json',
      'diff --git a/pyproject.toml b/pyproject.toml',
    ].join('\n');
    assert.deepStrictEqual(manifestsInDiff(diff).sort(), ['npm', 'pip']);
  }],

  ['parses npm audit and reports only critical and high', () => {
    const report = JSON.stringify({
      vulnerabilities: {
        'bad-pkg': { name: 'bad-pkg', severity: 'critical' },
        'meh-pkg': { name: 'meh-pkg', severity: 'high' },
        'fine-pkg': { name: 'fine-pkg', severity: 'moderate' },
        'whatever': { name: 'whatever', severity: 'low' },
      },
    });
    const findings = parseNpmAudit(report);
    const names = findings.map(f => f.package).sort();
    assert.deepStrictEqual(names, ['bad-pkg', 'meh-pkg']);
    // Moderate and low are real but not ship-blocking; blocking on them would
    // make the gate fire constantly and get switched off.
    assert(!names.includes('fine-pkg'));
  }],

  ['npm audit with no vulnerabilities yields nothing', () => {
    assert.deepStrictEqual(parseNpmAudit(JSON.stringify({ vulnerabilities: {} })), []);
  }],

  // npm audit exits non-zero when it finds something AND when it errors. A
  // parser that throws on unparseable output would turn a broken audit into a
  // blocked push, so it must degrade to "no findings" instead.
  ['unparseable audit output is not a finding', () => {
    assert.deepStrictEqual(parseNpmAudit('not json'), []);
    assert.deepStrictEqual(parseNpmAudit(''), []);
    assert.deepStrictEqual(parseNpmAudit(JSON.stringify({ error: { code: 'ENOLOCK' } })), []);
    assert.deepStrictEqual(parsePipAudit('not json'), []);
    assert.deepStrictEqual(parsePipAudit(''), []);
  }],

  ['parses pip-audit findings', () => {
    const report = JSON.stringify({
      dependencies: [
        { name: 'requests', version: '2.0.0', vulns: [{ id: 'GHSA-xxxx', fix_versions: ['2.31.0'] }] },
        { name: 'safe-lib', version: '1.0.0', vulns: [] },
      ],
    });
    const findings = parsePipAudit(report);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].package, 'requests');
    assert(findings[0].id.includes('GHSA'), 'finding must carry the advisory id');
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
