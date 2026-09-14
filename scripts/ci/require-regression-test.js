#!/usr/bin/env node
/**
 * Refuse a fix: or feat: commit that carries no regression test.
 *
 * Ported from open-gsd/gsd-core's lint-fix-has-regression-tests.cjs, built there
 * after three PRs shipped testless behind golden-fixture churn.
 *
 * rules/workflow.md already says "failing test first (RED), minimum code to pass
 * (GREEN)". It has no teeth. Every fix committed today carried a test because
 * someone was watching, which is not the same as the rule holding.
 *
 * Narrow on purpose:
 *
 *   Gated      fix:  feat:          — these claim behaviour changed
 *   Not gated  docs: chore: refactor: test: style: perf: build: ci:
 *
 * Blocking every commit type would train the user to reach for the escape hatch
 * by reflex, which is how a gate stops meaning anything.
 *
 * A fixture is not a test. That distinction is the whole point: a changed
 * golden file looks like test activity in a diff and asserts nothing new.
 *
 * Escape hatch: a `No-Regression-Test:` trailer with a reason. Deliberate,
 * stated, and visible in the log forever — which is the cost that keeps it rare.
 *
 * Usage: node require-regression-test.js [repo-root] [message-file]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.argv[2] || process.cwd();
const msgFile = process.argv[3];

// Inherited GIT_DIR/GIT_INDEX_FILE would describe the ambient repo, not `root`.
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: GIT_ENV }).trim();

function commitMessage() {
  if (msgFile && fs.existsSync(msgFile)) return fs.readFileSync(msgFile, 'utf8');
  for (const candidate of ['COMMIT_EDITMSG']) {
    const p = path.join(root, '.git', candidate);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return '';
}

const message = commitMessage();
const subject = message.split('\n')[0] || '';

// Only behaviour-claiming types are gated.
if (!/^(fix|feat)(\([^)]*\))?!?:/i.test(subject)) process.exit(0);

// A stated exemption is allowed, and permanent in the log.
if (/^No-Regression-Test:\s*\S/mi.test(message)) {
  console.log('require-regression-test: exemption declared in the commit message');
  process.exit(0);
}

let staged = [];
try {
  staged = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
} catch {
  process.exit(0); // no index to inspect; not this check's business
}
if (staged.length === 0) process.exit(0);

// A fixture, snapshot or baseline is data the test reads, not an assertion.
const IS_DATA = /(^|\/)(fixtures?|snapshots?|__snapshots__|baselines?|testdata)(\/|$)/i;
const IS_TEST = /(^|\/)(test_[^/]+\.py|[^/]+_test\.(py|go|rs|js|ts)|[^/]+\.(test|spec)\.[jt]sx?|[^/]+\.test\.cjs)$/i;
const IN_TEST_DIR = /(^|\/)(tests?|spec)(\/|$)/i;

const testChanges = staged.filter(f => {
  if (IS_DATA.test(f)) return false;
  if (IS_TEST.test(f)) return true;
  // A file inside tests/ that is not obviously data still counts as test work.
  return IN_TEST_DIR.test(f) && /\.(js|cjs|mjs|ts|tsx|py|go|rs)$/i.test(f);
});

if (testChanges.length > 0) {
  console.log(`require-regression-test: ${testChanges.length} test file(s) in this commit`);
  process.exit(0);
}

const dataOnly = staged.filter(f => IS_DATA.test(f));
console.error(`require-regression-test: "${subject.trim()}" changes behaviour but stages no test.\n`);
console.error(`  staged: ${staged.length} file(s), none of them a test`);
if (dataOnly.length) {
  console.error(`  note:   ${dataOnly.length} fixture/baseline file(s) changed — a fixture is not an assertion`);
}
console.error(
  `\nWrite the test that fails without this change. If there genuinely is nothing to` +
  `\nassert, say why in a trailer and it will stand in the log:` +
  `\n\n  No-Regression-Test: <reason>`
);
process.exit(1);
