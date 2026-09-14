#!/usr/bin/env node
/**
 * Tests for scripts/ci/require-regression-test.js
 *
 * Ported from open-gsd/gsd-core's scripts/lint-fix-has-regression-tests.cjs.
 * They built it after three PRs shipped testless behind golden-fixture churn.
 *
 * rules/workflow.md says "failing test first (RED), minimum code to pass (GREEN)".
 * Nothing checks. Every fix committed today happened to carry a test because I
 * was watching; the rule itself has no teeth.
 *
 * Scope is deliberately narrow — only fix: and feat: claim behaviour changed.
 * docs:, chore:, refactor: and test: do not, and blocking those would train the
 * user to reach for the escape hatch on every commit, which is how a gate dies.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const CHECK = path.join(__dirname, '..', 'scripts', 'ci', 'require-regression-test.js');

// Inherited GIT_* would point at the outer repo when run from our own hook.
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

function repo(files, message) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-gate-'));
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: 'pipe', env: GIT_ENV });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.invalid');
  git('config', 'user.name', 'T');
  fs.writeFileSync(path.join(root, 'seed.txt'), 'seed\n');
  git('add', '.');
  git('commit', '-qm', 'chore: seed');

  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  git('add', '-A');

  const msgFile = path.join(root, '.git', 'COMMIT_EDITMSG_TEST');
  fs.writeFileSync(msgFile, message);
  return { root, msgFile };
}

function check(files, message) {
  const { root, msgFile } = repo(files, message);
  const res = spawnSync('node', [CHECK, root, msgFile], { encoding: 'utf8', env: GIT_ENV });
  return { ok: res.status === 0, out: (res.stdout || '') + (res.stderr || '') };
}

const cases = [
  ['a fix with no test is refused', () => {
    const { ok, out } = check({ 'src/thing.js': 'export const x = 2;\n' }, 'fix: correct the off-by-one');
    assert(!ok, 'must fail');
    assert(/test/i.test(out), `must say what is missing, got: ${out}`);
  }],

  ['a fix carrying a test passes', () => {
    const { ok } = check({
      'src/thing.js': 'export const x = 2;\n',
      'tests/thing.test.js': "assert(x === 2);\n",
    }, 'fix: correct the off-by-one');
    assert(ok);
  }],

  ['a feat with no test is refused', () => {
    assert(!check({ 'src/new.js': 'export const y = 1;\n' }, 'feat: add y').ok);
  }],

  ['python test naming is recognised too', () => {
    const { ok } = check({
      'src/thing.py': 'x = 2\n',
      'tests/test_thing.py': 'def test_thing(): assert True\n',
    }, 'fix: correct the off-by-one');
    assert(ok, 'test_*.py is a test file');
  }],

  ['docs, chore, refactor and test commits are not gated', () => {
    for (const m of ['docs: explain the gate', 'chore: bump dep', 'refactor: rename', 'test: add coverage']) {
      assert(check({ 'src/thing.js': 'export const x = 3;\n' }, m).ok, `should allow: ${m}`);
    }
  }],

  ['a fixture is not a test', () => {
    // The exact hole upstream built this for: golden-fixture churn reading as coverage.
    const { ok } = check({
      'src/thing.js': 'export const x = 2;\n',
      'tests/fixtures/sample.json': '{"a":1}\n',
    }, 'fix: correct the off-by-one');
    assert(!ok, 'a fixture change is not a regression test');
  }],

  ['an explicit, stated exemption is honoured', () => {
    const { ok } = check(
      { 'src/thing.js': 'export const x = 2;\n' },
      'fix: correct a typo in a log string\n\nNo-Regression-Test: log text only, no behaviour to assert.'
    );
    assert(ok, 'a deliberate, reasoned exemption must be possible');
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
console.log(`\nregression-test-gate: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
