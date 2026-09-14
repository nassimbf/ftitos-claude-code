#!/usr/bin/env node
/**
 * Tests for hooks/scripts/secret-read-guard.js
 *
 * Ported from open-gsd/gsd-core's gsd-secret-read-guard.js (1,105 lines there;
 * this is the portable core without GSD's workflow coupling).
 *
 * The gap it closes: pre-secrets-block.js stops secrets being WRITTEN. Nothing
 * stopped them being READ. Three tools can put file contents into the
 * conversation -- Read, Grep, and Bash -- and a secret in the transcript is a
 * secret in every subsequent request, including to any subagent.
 *
 * Why a hook and not a settings.json deny rule, per GSD's own note: a Read()
 * deny rule arms a Claude Code check that prompts on ANY `cd DIR && cat path`
 * compound, even in auto mode. A PreToolUse denial does not, and it still
 * applies under bypassPermissions.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'secret-read-guard.js');

function blocked(tool, toolInput) {
  const payload = JSON.stringify({ tool_name: tool, tool_input: toolInput });
  const res = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  let parsed = {};
  try { parsed = JSON.parse(res.stdout || '{}'); } catch { /* no decision */ }
  return parsed.decision === 'block';
}

const read = p => blocked('Read', { file_path: p });
const bash = c => blocked('Bash', { command: c });
const grep = (pattern, p) => blocked('Grep', { pattern, path: p });

const cases = [
  ['Read of a secret file is blocked', () => {
    assert(read('/proj/.env'), '.env');
    assert(read('/proj/.secrets'), '.secrets');
    assert(read('/proj/.env.local'), '.env.local');
    assert(read('/proj/.env.production'), '.env.production');
  }],

  ['case does not launder a secret name', () => {
    // On macOS these ARE the secret file.
    assert(read('/proj/.ENV'), '.ENV');
    assert(read('/proj/.Secrets'), '.Secrets');
  }],

  ['non-secret templates stay readable', () => {
    assert(!read('/proj/.env.example'), '.env.example');
    assert(!read('/proj/.env.sample'), '.env.sample');
    assert(!read('/proj/.env.template'), '.env.template');
    assert(!read('/proj/.env.dist'), '.env.dist');
    assert(!read('/proj/.env.local.example'), '.env.local.example');
  }],

  ['ordinary files are untouched', () => {
    assert(!read('/proj/src/index.js'));
    assert(!read('/proj/README.md'));
    assert(!read('/proj/environment.md'), 'substring match would wrongly catch this');
  }],

  ['Bash cannot read a secret out through cat', () => {
    assert(bash('cat .env'));
    assert(bash('cat /proj/.env'));
    assert(bash('grep API_KEY .env'));
    assert(bash('cd /proj && cat .env'));
  }],

  ['Bash cannot read a secret out through git', () => {
    // Caught by testing the part after the last ':', with no git-specific parsing.
    assert(bash('git show HEAD:.env'));
    assert(bash('git show origin/main:config/.env'));
  }],

  ['Bash cannot launder a secret through a subshell', () => {
    assert(bash('echo $(cat .env)'));
    assert(bash('bash -c "cat .env"'));
  }],

  ['ordinary Bash still runs', () => {
    assert(!bash('cat README.md'));
    assert(!bash('cat .env.example'));
    assert(!bash('git status'));
    assert(!bash('npm run build'));
  }],

  ['Grep cannot target the secret namespace', () => {
    assert(grep('KEY', '/proj/.env'));
    assert(!grep('KEY', '/proj/src'));
  }],

  // Regression (observed 2026-09-14): the guard blocked the commit that
  // introduced it, because the message named .ENV. Writing about a secret file
  // is not reading one -- the same distinction cc-safety-net already draws.
  ['a commit message may name a secret file', () => {
    assert(!bash('git commit -m "docs: explain why .env is unreadable"'));
    assert(!bash("git commit -m 'fix: guard .ENV and .secrets'"));
    assert(!bash("git commit -F - <<'MSG'\nfeat: block .env reads\n\nAlso covers .ENV on macOS.\nMSG"));
  }],

  ['but a heredoc fed to a shell is still executable', () => {
    assert(bash("bash <<'EOF'\ncat .env\nEOF"), 'heredoc into a shell runs');
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
console.log(`\nsecret-read-guard: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
