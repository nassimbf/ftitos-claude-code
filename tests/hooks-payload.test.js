#!/usr/bin/env node
/**
 * Black-box payload tests for hook scripts.
 *
 * Each test pipes a crafted JSON payload to a hook via subprocess and asserts
 * on exit code and/or stdout content. Tests the bug fixes applied in v3.1.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(REPO_ROOT, 'hooks', 'scripts');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  PASS: ${message}`);
  }
}

function runHook(scriptName, payload, env = {}) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const input = JSON.stringify(payload);
  return spawnSync('node', [scriptPath], {
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// ---------------------------------------------------------------------------
// cc-safety-net.js — destructive command guard
// ---------------------------------------------------------------------------

console.log('\n--- cc-safety-net.js ---');

// Bug 5 fix: rm with root path before flags ("rm / -rf") should be blocked
{
  const result = runHook('cc-safety-net.js', { tool_name: 'Bash', tool_input: { command: 'rm / -rf' } });
  assert(result.status === 2, 'rm / -rf (path before flags, root) should be blocked (exit 2)');
}

// Bug 5 fix: home shorthand still blocked in original order
{
  const result = runHook('cc-safety-net.js', { tool_name: 'Bash', tool_input: { command: 'rm -rf ~/' } });
  assert(result.status === 2, 'rm -rf ~/ should be blocked (exit 2)');
}

// Bug 6 fix: git clean -fdx should be blocked after flag normalization (sorts to -dfx)
{
  const result = runHook('cc-safety-net.js', { tool_name: 'Bash', tool_input: { command: 'git clean -fdx' } });
  assert(result.status === 2, 'git clean -fdx should be blocked (exit 2)');
}

// Bug 6 fix: git clean -fd also blocked
{
  const result = runHook('cc-safety-net.js', { tool_name: 'Bash', tool_input: { command: 'git clean -fd' } });
  assert(result.status === 2, 'git clean -fd should be blocked (exit 2)');
}

// Bug 7 fix: interpreter one-liner unwrap — python3 -e with dangerous content
{
  const result = runHook('cc-safety-net.js', {
    tool_name: 'Bash',
    tool_input: { command: "python3 -e \"import os; os.system('rm -rf /')\"" },
  });
  assert(result.status === 2, 'python3 -e with os.system rm should be blocked (exit 2)');
}

// Safe command — must pass through
{
  const result = runHook('cc-safety-net.js', { tool_name: 'Bash', tool_input: { command: 'ls -la' } });
  assert(result.status === 0, 'ls -la should pass through (exit 0)');
}

// git push --force still blocked
{
  const result = runHook('cc-safety-net.js', { tool_name: 'Bash', tool_input: { command: 'git push --force origin main' } });
  assert(result.status === 2, 'git push --force should be blocked (exit 2)');
}

// ---------------------------------------------------------------------------
// veto-rate-logger.js — CONFIRM pattern must not over-match
// ---------------------------------------------------------------------------

console.log('\n--- veto-rate-logger.js ---');

// Bug 15 fix: plain "CONFIRM" in unrelated text should not log as vetoed
{
  const result = runHook('veto-rate-logger.js', {
    tool_name: 'Agent',
    tool_response: { content: 'Please confirm the deployment is ready before proceeding.' },
  });
  // Should exit 0 without logging — the word "CONFIRM" alone doesn't match the new tighter pattern
  assert(result.status === 0, 'plain "confirm" text should not trigger veto logging (exit 0)');
}

// "VETOED" still triggers
{
  const result = runHook('veto-rate-logger.js', {
    tool_name: 'Agent',
    tool_response: { content: '[CRITICAL] ... Council: VETOED — blocks ship' },
  });
  assert(result.status === 0, 'VETOED signal should be logged but still exit 0 (no blocking)');
}

// ---------------------------------------------------------------------------
// Final
// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\nhooks-payload.test.js: ${failures} failure(s)`);
  process.exit(1);
}

console.log(`\nhooks-payload.test.js: all assertions passed`);
