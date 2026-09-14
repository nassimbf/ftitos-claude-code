#!/usr/bin/env node
/**
 * Tests for the install manifest in scripts/install-apply.js
 *
 * Two defects found 2026-09-15, both from the same mistake: the manifest
 * recorded what the installer *changed*, not what it *owns*.
 *
 * 1. uninstall.js was broken. It removes `manifest.files`, and on any run after
 *    the first the installer copies nothing — so the manifest was written with
 *    an empty list and uninstall removed nothing. Install twice, uninstall, and
 *    the whole harness stays on disk.
 *
 * 2. Nothing ever reaped stale files. A script dropped from the repo between
 *    versions is in neither the repo nor the manifest, so no step removes it.
 *    31 orphans from v3/v4 had accumulated in ~/.claude/scripts/hooks/ by v6 —
 *    none registered, none running, but `ls` there no longer answered "what is
 *    installed?" truthfully.
 *
 * The fix is one idea: the manifest lists every file the installer owns,
 * whether or not this particular run touched it. Reaping then falls out —
 * anything in the previous manifest and not in the current one is a file we
 * installed and no longer ship.
 *
 * The safety property that makes reaping acceptable: it only ever removes paths
 * the installer itself recorded. A user's own hook in ~/.claude, or another
 * tool's, was never in our manifest and is never touched.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const INSTALLER = path.join(REPO, 'scripts', 'install-apply.js');
const MANIFEST = '.ftitos-cc-manifest.json';

function withTempHome(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'install-manifest-'));
  try {
    return fn(home);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function install(home) {
  return execFileSync('node', [INSTALLER], {
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, HOME: home },
  });
}

function readManifest(home) {
  const p = path.join(home, '.claude', MANIFEST);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const cases = [
  ['a fresh install records every file it owns', () => withTempHome(home => {
    install(home);
    const m = readManifest(home);
    assert(m, 'manifest must exist after install');
    assert(Array.isArray(m.files), 'manifest.files must be a list');
    assert(m.files.length > 50,
      `a full install owns far more than ${m.files.length} files — is it recording only changes?`);
  })],

  // The bug that broke uninstall. The second run copies nothing, and the
  // manifest used to be rewritten with an empty list.
  ['a second install does not empty the manifest', () => withTempHome(home => {
    install(home);
    const first = readManifest(home).files.length;

    install(home);
    const second = readManifest(home).files.length;

    assert.strictEqual(second, first,
      `manifest shrank from ${first} to ${second} on a no-op install — `
      + 'uninstall would then remove nothing');
  })],

  ['every path in the manifest actually exists on disk', () => withTempHome(home => {
    install(home);
    const missing = readManifest(home).files.filter(f => !fs.existsSync(f));
    assert.deepStrictEqual(missing.slice(0, 5), [],
      'manifest lists files that are not installed');
  })],

  ['the manifest covers hooks, agents and rules', () => withTempHome(home => {
    install(home);
    const files = readManifest(home).files.join('\n');
    for (const part of ['scripts/hooks', 'agents', 'rules']) {
      assert(files.includes(part), `manifest omits ${part}`);
    }
  })],

  // Reaping: a file we installed, then stopped shipping, must not survive.
  ['a file the installer owns but no longer ships is removed', () => withTempHome(home => {
    install(home);

    const orphan = path.join(home, '.claude', 'scripts', 'hooks', 'zz-retired-hook.js');
    fs.writeFileSync(orphan, '// shipped by an older version\n');

    // Pretend a previous version installed it.
    const p = path.join(home, '.claude', MANIFEST);
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    m.files.push(orphan);
    fs.writeFileSync(p, JSON.stringify(m, null, 2));

    install(home);

    assert(!fs.existsSync(orphan),
      'a file recorded in the manifest and no longer shipped must be reaped');
  })],

  // The safety property. Without this, an installer that reaps is an installer
  // that eats a user's own configuration.
  ['a file the installer never owned is left alone', () => withTempHome(home => {
    install(home);

    const theirs = path.join(home, '.claude', 'scripts', 'hooks', 'my-own-hook.js');
    fs.writeFileSync(theirs, '// written by the user, never in our manifest\n');

    install(home);

    assert(fs.existsSync(theirs),
      'the installer removed a file it never installed — it must only reap its own');
  })],
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
console.log(`\ninstall-manifest: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
