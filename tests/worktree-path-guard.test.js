#!/usr/bin/env node
/**
 * Tests for hooks/scripts/worktree-path-guard.js
 *
 * Ported from open-gsd/gsd-core's gsd-worktree-path-guard.js (their issue #260):
 * an agent working inside a worktree issues an Edit with an absolute path rooted
 * at the MAIN repo, and silently edits the wrong checkout. Their prose guard was
 * skipped by the model under load, so they moved it to the tooling layer.
 *
 * Relevant here because A3 runs several worktrees at once and has a logged
 * incident of parallel sessions colliding in one tree.
 *
 * Builds a real repo and a real linked worktree; this cannot be faked with paths.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'worktree-path-guard.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-guard-'));
const main = path.join(root, 'main');
const tree = path.join(root, 'wt');

// Scrub inherited GIT_* vars. Run from a git hook (our own pre-commit gate) the
// environment carries GIT_DIR and GIT_INDEX_FILE pointing at the OUTER repo, and
// every git call below would operate on that instead of the fixture -- passing
// standalone and failing in the suite.
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe', env: GIT_ENV });

fs.mkdirSync(main);
git(main, 'init', '-q', '-b', 'main');
git(main, 'config', 'user.email', 't@example.invalid');
git(main, 'config', 'user.name', 'T');
fs.writeFileSync(path.join(main, 'file.txt'), 'x\n');
git(main, 'add', '.');
git(main, 'commit', '-qm', 'init');
git(main, 'worktree', 'add', '-q', '-b', 'side', tree);

function blocked(cwd, filePath, tool = 'Edit') {
  const payload = JSON.stringify({ tool_name: tool, tool_input: { file_path: filePath } });
  const res = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8', cwd, env: GIT_ENV });
  let parsed = {};
  try { parsed = JSON.parse(res.stdout || '{}'); } catch { /* no decision */ }
  return parsed.decision === 'block';
}

const cases = [
  ['from a worktree, an absolute path into the main repo is blocked', () => {
    assert(blocked(tree, path.join(main, 'file.txt')), 'editing the main checkout from a worktree');
  }],

  ['from a worktree, paths inside the worktree are allowed', () => {
    assert(!blocked(tree, path.join(tree, 'file.txt')));
    assert(!blocked(tree, path.join(tree, 'nested', 'new.txt')), 'new files too');
  }],

  ['relative paths are never blocked — they resolve against cwd already', () => {
    assert(!blocked(tree, 'file.txt'));
    assert(!blocked(tree, './src/x.js'));
  }],

  ['outside a worktree the guard is inert', () => {
    // In the main repo there is no containment boundary to enforce.
    assert(!blocked(main, path.join(tree, 'file.txt')));
    assert(!blocked(main, path.join(main, 'file.txt')));
  }],

  ['it fails open outside any repo', () => {
    assert(!blocked(root, path.join(main, 'file.txt')), 'no worktree root resolvable => allow');
  }],

  ['covers Write and MultiEdit, not just Edit', () => {
    assert(blocked(tree, path.join(main, 'file.txt'), 'Write'));
    assert(blocked(tree, path.join(main, 'file.txt'), 'MultiEdit'));
  }],

  ['reads are never blocked — this guards writes only', () => {
    assert(!blocked(tree, path.join(main, 'file.txt'), 'Read'));
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
console.log(`\nworktree-path-guard: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
