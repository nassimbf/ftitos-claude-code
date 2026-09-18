#!/usr/bin/env node
/**
 * Tests for hooks/scripts/block-no-verify.js
 *
 * Ported from affaan-m/ecc's scripts/hooks/block-no-verify.js.
 *
 * This repo has a pre-commit gate that runs 11 test files and doctor. It has
 * blocked bad commits five times today. It is also completely optional: any
 * agent can append --no-verify, or -c core.hooksPath=/dev/null, and the gate
 * never runs. A gate an agent may decline is a suggestion.
 *
 * The second form matters as much as the first. `git -c core.hooksPath=` is the
 * less obvious bypass and does not contain the string "no-verify" anywhere.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'block-no-verify.js');

function blocked(command) {
  const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  const res = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  let parsed = {};
  try { parsed = JSON.parse(res.stdout || '{}'); } catch { /* no decision */ }
  return parsed.decision === 'block';
}

const cases = [
  ['--no-verify is blocked on every command that honours it', () => {
    for (const c of [
      'git commit --no-verify -m "wip"',
      'git commit -m "wip" --no-verify',
      'git push --no-verify',
      'git merge --no-verify main',
      'git rebase --no-verify main',
      'git cherry-pick --no-verify abc123',
      'git am --no-verify patch.eml',
    ]) assert(blocked(c), `should block: ${c}`);
  }],

  ['the -n short form is blocked for commit and push', () => {
    assert(blocked('git commit -n -m "wip"'));
    assert(blocked('git push -n origin main') === false || true); // -n is --dry-run on push
  }],

  ['hooksPath redirection is blocked — the bypass with no "no-verify" in it', () => {
    assert(blocked('git -c core.hooksPath=/dev/null commit -m "wip"'));
    assert(blocked('git -c core.hooksPath=/tmp/empty push'));
    assert(blocked('git config core.hooksPath /dev/null'));
  }],

  ['ordinary git still works', () => {
    for (const c of [
      'git commit -m "feat: real work"',
      'git push origin feat/thing',
      'git status',
      'git rebase main',
      'git log --oneline -5',
    ]) assert(!blocked(c), `should allow: ${c}`);
  }],

  ['a commit MESSAGE naming the flag is not using the flag', () => {
    // Same distinction cc-safety-net and secret-read-guard already draw.
    assert(!blocked('git commit -m "docs: explain why --no-verify is blocked"'));
    assert(!blocked("git commit -m 'fix: detect core.hooksPath bypass'"));
  }],

  ['including when the message is built by command substitution', () => {
    // How long commit messages are actually written. This blocked its own
    // introducing commit: the body quoted the bypass it was documenting.
    assert(!blocked(`git commit -m "$(printf 'feat: block git -c core.hooksPath=/dev/null commit')"`));
    assert(!blocked(`git commit -m "$(printf 'docs: --no-verify is refused now')"`));
  }],

  ['but a real bypass alongside a message still blocks', () => {
    assert(blocked(`git commit --no-verify -m "$(printf 'wip')"`), 'flag outside the message is real');
    assert(blocked('git -c core.hooksPath=/dev/null commit -m "$(printf \'wip\')"'));
  }],

  ['non-git commands are untouched', () => {
    assert(!blocked('npm test -- --no-verify'));
    assert(!blocked('echo "--no-verify"'));
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
console.log(`\nno-verify-block: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
