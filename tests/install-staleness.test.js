#!/usr/bin/env node
/**
 * Tests for the staleness handling in scripts/install-apply.js
 *
 * Regression driver (observed 2026-09-14, twice in one session): the installer
 * skipped any file that already existed, so a hook fixed in this repo never
 * reached ~/.claude. The live cc-safety-net.js ran several fixes behind and
 * blocked legitimate work while the repo copy was correct the whole time.
 *
 * `--force` existed but overwrites everything including a user's own edits, so
 * it was too blunt to use routinely — and therefore never used.
 *
 * The distinction that matters: "already present" and "present but out of date"
 * are different facts. These tests pin all three outcomes.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const INSTALLER = path.join(REPO, 'scripts', 'install-apply.js');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-stale-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// The installer targets $HOME/.claude. Point HOME at a scratch dir so the test
// can never touch the developer's real install — the failure this hook family
// exists to prevent is exactly "a tool wrote somewhere it should not have".
function dryRun(home) {
  return execFileSync('node', [INSTALLER, '--dry-run'], {
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, HOME: home },
  });
}

const cases = [
  ['reports a file that does not exist yet as a copy', () => withTempDir(home => {
    const out = dryRun(home);
    assert(/WOULD COPY/.test(out), 'a fresh install must plan to copy files');
    assert(!/WOULD UPDATE/.test(out), 'nothing can be stale in an empty install');
  })],

  ['reports an identical file as skipped, not as an update', () => withTempDir(home => {
    const src = path.join(REPO, 'hooks', 'scripts', 'cc-safety-net.js');
    const dest = path.join(home, '.claude', 'scripts', 'hooks', 'cc-safety-net.js');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);

    const out = dryRun(home);
    const line = out.split('\n').find(l => l.includes('cc-safety-net.js'));
    assert(line, 'installer must mention the file');
    assert(/SKIP \(identical\)/.test(line), `identical file should skip, got: ${line}`);
  })],

  // The load-bearing case: this is the bug. Before the fix the line read
  // "SKIP (exists)" and the fix never shipped.
  ['reports a DIFFERENT file as stale and plans to update it', () => withTempDir(home => {
    const dest = path.join(home, '.claude', 'scripts', 'hooks', 'cc-safety-net.js');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, '// an old version, several fixes behind\n');

    const out = dryRun(home);
    const line = out.split('\n').find(l => l.includes('cc-safety-net.js'));
    assert(line, 'installer must mention the file');
    assert(
      /WOULD UPDATE \(stale\)/.test(line),
      `a file whose content differs must be reported stale, got: ${line}`
    );
  })],

  ['a dry run writes nothing at all', () => withTempDir(home => {
    dryRun(home);
    const claude = path.join(home, '.claude');
    const wroteAnything = fs.existsSync(claude)
      && fs.readdirSync(claude).length > 0;
    assert(!wroteAnything, '--dry-run must not create or modify any file');
  })],

  // Second bug, found by running the fixed installer: `$HOME/...` and the
  // expanded `/Users/me/...` are the same registration but not the same string,
  // so dedup missed and the merge added a second copy of hooks already present.
  // That is the v4 duplicate-hooks bug (1f4fafc) arriving by another route — an
  // install produced 9 duplicates, and a duplicated PreToolUse hook runs every
  // guard twice on every call.
  ['installing twice adds no duplicate hook registrations', () => withTempDir(home => {
    const env = { ...process.env, HOME: home };
    const run = () => execFileSync('node', [INSTALLER], { encoding: 'utf8', cwd: REPO, env });

    run();
    const second = run();
    assert(
      /All hooks already present/.test(second),
      'a second install must be a no-op for hooks'
    );

    const settings = JSON.parse(
      fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8')
    );
    for (const [event, entries] of Object.entries(settings.hooks || {})) {
      const seen = new Set();
      for (const entry of entries) {
        for (const hook of entry.hooks || []) {
          // Same normalisation the installer uses: resolved path, no quotes.
          const key = `${entry.matcher}::${String(hook.command || '')
            .replace(/\$\{HOME\}|\$HOME\b/g, home)
            .replace(/["']/g, '')
            .trim()}`;
          assert(!seen.has(key), `${event} registers this hook twice: ${key}`);
          seen.add(key);
        }
      }
    }
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
console.log(`\ninstall-staleness: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
