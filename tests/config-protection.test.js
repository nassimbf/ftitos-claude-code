#!/usr/bin/env node
/**
 * Tests for hooks/scripts/config-protection.js
 *
 * Ported from affaan-m/ecc's scripts/hooks/config-protection.js.
 *
 * The cheat: the type checker fails, so the agent adds the rule to the ignore
 * list. The suite goes green, the commit passes every gate added today, and the
 * defect ships. Every other guard here watches the code; nothing watches the
 * thing that decides what "passing" means.
 *
 * Creating a config is allowed — a project needs one. Loosening an existing one
 * mid-task is the move worth interrupting.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'config-protection.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'config-prot-'));
const existing = name => {
  const p = path.join(tmp, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, '{}\n');
  return p;
};

function blocked(filePath, tool = 'Edit') {
  const payload = JSON.stringify({ tool_name: tool, tool_input: { file_path: filePath } });
  const res = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  let parsed = {};
  try { parsed = JSON.parse(res.stdout || '{}'); } catch { /* no decision */ }
  return parsed.decision === 'block';
}

const cases = [
  ['editing an existing linter or type-checker config is blocked', () => {
    for (const n of [
      '.eslintrc.json', 'eslint.config.mjs', '.prettierrc',
      'ruff.toml', '.ruff.toml', 'mypy.ini', '.mypy.ini',
      'tsconfig.json', 'pyrightconfig.json', '.flake8',
    ]) assert(blocked(existing(n)), `should block: ${n}`);
  }],

  ['creating a config that does not exist yet is allowed', () => {
    assert(!blocked(path.join(tmp, 'brand-new', 'tsconfig.json'), 'Write'),
      'a project needs to be able to acquire a config');
  }],

  ['ordinary source files are untouched', () => {
    assert(!blocked(existing('src/index.ts')));
    assert(!blocked(existing('package.json')), 'package.json is not a quality gate config');
    assert(!blocked(existing('README.md')));
  }],

  ['a config-shaped name inside node_modules is not the project config', () => {
    assert(!blocked(existing('node_modules/pkg/tsconfig.json')));
  }],

  ['pyproject.toml is guarded only for its tool sections', () => {
    // It carries ruff/mypy config alongside packaging metadata, so it is in scope.
    assert(blocked(existing('pyproject.toml')));
  }],

  ['reads are never blocked', () => {
    assert(!blocked(existing('.eslintrc.json'), 'Read'));
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
console.log(`\nconfig-protection: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
