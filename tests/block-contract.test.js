#!/usr/bin/env node
/**
 * Every blocking hook must actually block, by one of the two recognised
 * mechanisms.
 *
 * Claude Code accepts two ways for a PreToolUse hook to refuse a call:
 *
 *   A. exit 2, with the reason on stdout as hookSpecificOutput (or on stderr)
 *   B. exit 0, with {"decision":"block","reason":...} on stdout
 *
 * This repo uses both — six hooks each, discovered 2026-09-15. Neither is
 * wrong, and rewriting six working security hooks to pick a winner would be
 * churn with real risk attached for a cosmetic gain.
 *
 * The actual hazard is different, and it is what this file closes: a hook that
 * means to block but signals by NEITHER mechanism looks healthy. It runs, it
 * exits 0, it prints a stern message nobody acts on, and the tool call proceeds.
 * That is "nothing fails with success" — the same defect class as a crash that
 * fails open, and it would not be caught by any other test here, because every
 * other test checks one hook against one input it already knows about.
 *
 * So: drive each blocking hook with a payload it is supposed to refuse, and
 * assert the refusal is legible to the host. Adding a hook that forgets to
 * signal fails this file.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS = path.join(__dirname, '..', 'hooks', 'scripts');

const EXIT_BLOCK = 2;

/**
 * @returns {{blocked: boolean, how: string|null, reason: string}}
 */
function runHook(script, payload) {
  const r = spawnSync('node', [path.join(HOOKS, script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });

  const stdout = r.stdout || '';
  const stderr = r.stderr || '';

  if (r.status === EXIT_BLOCK) {
    return { blocked: true, how: 'exit-2', reason: (stdout + stderr).trim() };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(stdout);
  } catch { /* not JSON — not mechanism B */ }

  if (parsed && parsed.decision === 'block') {
    return { blocked: true, how: 'decision', reason: String(parsed.reason || '') };
  }

  return { blocked: false, how: null, reason: (stdout + stderr).trim() };
}

// Each entry: a hook, a payload it MUST refuse, and a payload it must allow.
// The allow case matters as much: a hook that blocks everything is not enforcing
// a rule, it is broken, and it would pass a block-only assertion.
const CONTRACTS = [
  {
    script: 'cc-safety-net.js',
    block: { tool_name: 'Bash', tool_input: { command: 'rm -rf /' } },
    allow: { tool_name: 'Bash', tool_input: { command: 'git status' } },
  },
  {
    script: 'pre-secrets-block.js',
    block: { tool_name: 'Write', tool_input: { file_path: '.env', content: 'K=v' } },
    allow: { tool_name: 'Write', tool_input: { file_path: 'notes.md', content: 'hello' } },
  },
  {
    script: 'secret-read-guard.js',
    block: { tool_name: 'Read', tool_input: { file_path: '.env' } },
    allow: { tool_name: 'Read', tool_input: { file_path: 'README.md' } },
  },
  {
    script: 'block-no-verify.js',
    block: { tool_name: 'Bash', tool_input: { command: 'git commit --no-verify -m x' } },
    allow: { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } },
  },
  {
    script: 'pre-bash-dev-server-block.js',
    block: { tool_name: 'Bash', tool_input: { command: 'npm run dev' } },
    allow: { tool_name: 'Bash', tool_input: { command: 'npm run build' } },
  },
];

const cases = [];

for (const { script, block, allow } of CONTRACTS) {
  cases.push([`${script} refuses by a recognised mechanism`, () => {
    const r = runHook(script, block);
    assert(
      r.blocked,
      `${script} did NOT block a payload it must refuse. `
      + 'It signalled neither exit 2 nor {"decision":"block"}, so the host would '
      + `let the call through. Output was: ${r.reason.slice(0, 200)}`
    );
    assert(['exit-2', 'decision'].includes(r.how), `${script}: unknown mechanism ${r.how}`);
  }]);

  cases.push([`${script} states a reason when it blocks`, () => {
    const r = runHook(script, block);
    assert(r.reason.length > 20,
      `${script} blocked with no usable reason — the model cannot correct what it cannot read`);
  }]);

  cases.push([`${script} lets a legitimate call through`, () => {
    const r = runHook(script, allow);
    assert(!r.blocked,
      `${script} blocked a legitimate call — a hook that refuses everything is broken, not strict`);
  }]);
}

// Documents the split so a reader knows both are expected, and so a future
// change that quietly converts everything to one mechanism is visible.
cases.push(['both mechanisms are in use, and that is intentional', () => {
  const used = new Set(
    CONTRACTS.map(c => runHook(c.script, c.block).how)
  );
  assert(used.has('exit-2'), 'expected at least one hook to use exit 2');
  assert(used.has('decision'), 'expected at least one hook to use decision:block');
}]);

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
console.log(`\nblock-contract: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
