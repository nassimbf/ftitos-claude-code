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
