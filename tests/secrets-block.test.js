#!/usr/bin/env node
/**
 * Tests for hooks/scripts/pre-secrets-block.js
 *
 * Contract: PreToolUse hook. Reads a tool-call payload on stdin.
 * Exit 2 = blocked. Exit 0 = allowed.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'pre-secrets-block.js');
const EXIT_BLOCKED = 2;
const EXIT_ALLOWED = 0;

function run(toolName, toolInput) {
  const payload = JSON.stringify({ tool_name: toolName, tool_input: toolInput });
  return spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
}

const blocked = (name, input) => run(name, input).status === EXIT_BLOCKED;

const BLOCKED_PATHS = [
  '.env',
  '/srv/app/.env.production',
  'config/secrets.yml',
  'certs/server.pem',
  'deploy/id_rsa',
  'keys/private.key',
  'app/credentials.json',
];

const ALLOWED_PATHS = [
  '.env.example',
  '.env.template',
  '.env.tpl',
  'src/environment.ts',
  'docs/keyboard.md',
  'README.md',
];

const SECRET_BODIES = [
  'ANTHROPIC_KEY = "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"',
  'const t = "ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";',
  'aws_access_key_id = AKIAIOSFODNN7EXAMPLE',
  'PRIVATE = "-----BEGIN RSA PRIVATE KEY-----"',
  'password = "hunter2correcthorsebatterystaple"',
];

const SAFE_BODIES = [
  'const key = process.env.ANTHROPIC_API_KEY;',
  'ANTHROPIC_API_KEY=your-key-here',
  'password = os.environ["DB_PASSWORD"]',
  '# set sk- keys via the secret manager, never inline',
  'token = config.get("token")',
];

const cases = [
  ['blocks writes to sensitive paths', () => {
    BLOCKED_PATHS.forEach(p =>
      assert(blocked('Write', { file_path: p, content: 'x' }), `should block path: ${p}`));
  }],

  ['allows writes to example and template files', () => {
    ALLOWED_PATHS.forEach(p =>
      assert(!blocked('Write', { file_path: p, content: 'x' }), `should allow path: ${p}`));
  }],

  ['blocks content containing live credentials', () => {
    SECRET_BODIES.forEach(c =>
      assert(blocked('Write', { file_path: 'src/config.ts', content: c }), `should block body: ${c.slice(0, 40)}`));
  }],

  ['allows env-var references and placeholders', () => {
    SAFE_BODIES.forEach(c =>
      assert(!blocked('Write', { file_path: 'src/config.ts', content: c }), `should allow body: ${c.slice(0, 40)}`));
  }],

  ['blocks credentials introduced via Edit new_string', () => {
    assert(blocked('Edit', {
      file_path: 'src/config.ts',
      old_string: 'const k = "";',
      new_string: 'const k = "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";',
    }));
  }],

  ['ignores unrelated tools', () => {
    assert(!blocked('Bash', { command: 'echo sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' }));
  }],

  ['passes through malformed payloads without blocking', () => {
    const r = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
    assert.strictEqual(r.status, EXIT_ALLOWED);
  }],

  ['explains the reason on stdout when blocking', () => {
    const r = run('Write', { file_path: '.env', content: 'x' });
    assert.match(r.stdout, /SECRETS-BLOCK/);
  }],

  // Crash policy. One catch used to cover two failures with opposite correct
  // policies: a payload we cannot parse (fail OPEN — never block on input we
  // could not read) and a crash inside the scan itself (must fail CLOSED — this
  // hook's entire job is stopping a secret, so its own bug must not wave one
  // through). Conflating them meant a throw anywhere in checkPath/checkBody
  // shipped the secret silently. Both directions are pinned.
  ['a crash inside the scan fails CLOSED', () => {
    // A non-string file_path makes path.basename throw inside checkPath. It is a
    // real reachable crash — the payload shape is whatever the tool sends us —
    // and it stands in for any defect on the scan path.
    const hostile = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: { nested: true }, content: 'x' },
    });
    const r = spawnSync('node', [HOOK], { input: hostile, encoding: 'utf8' });
    assert.notStrictEqual(
      r.status, EXIT_ALLOWED,
      'a scan crash must not pass the write through'
    );
    assert.match(r.stderr, /failing closed/, 'the crash must say what it did');
  }],

  ['input we cannot parse still fails OPEN', () => {
    for (const bad of ['not json', '', '{"tool_name":']) {
      const r = spawnSync('node', [HOOK], { input: bad, encoding: 'utf8' });
      assert.strictEqual(
        r.status, EXIT_ALLOWED,
        `unparseable input must not block: ${JSON.stringify(bad)}`
      );
    }
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
console.log(`\nsecrets-block: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
