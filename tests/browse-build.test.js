#!/usr/bin/env node
/**
 * Tests for the browse-binary build gate in scripts/install-apply.js
 *
 * Found 2026-09-15 by installing a fresh GitHub clone into an empty HOME —
 * the first thing a new user does, and the first thing nobody had tried.
 *
 * `skills/browse` and `skills/qa` both instruct the model to run
 * `$HOME/.claude/skills/browse/dist/browse`. That is a ~61 MB compiled binary,
 * and `.gitignore:10` excludes `skills/browse/dist/`. So it is absent from any
 * clone, and neither install.sh nor install-apply.js ever called the build
 * script sitting at skills/browse/scripts/build-node-server.sh.
 *
 * Result: a new user's very first `node scripts/doctor.js` failed with two
 * dangling skill references. It passed here only because this machine had the
 * binary from an earlier vendoring — the exact shape of "works on my machine".
 *
 * The rule these tests pin: NEVER install a skill whose executable is missing.
 * A skill that tells the model to run a binary that is not there is worse than
 * no skill — the model tries, fails, and has to recover. Build it if we can,
 * skip the skill if we cannot, and in both cases leave doctor clean.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const INSTALLER = path.join(REPO, 'scripts', 'install-apply.js');
const BINARY_DEPENDENT = ['browse', 'qa'];

function withTempHome(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'browse-build-'));
  try {
    return fn(home);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function install(home, env = {}) {
  return execFileSync('node', [INSTALLER], {
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, HOME: home, ...env },
  });
}

const binaryPresent = fs.existsSync(path.join(REPO, 'skills', 'browse', 'dist', 'browse'));

const cases = [
  // The invariant that matters, and it holds either way: installed skills never
  // point at a missing executable.
  ['no installed skill references a binary that is not installed', () => withTempHome(home => {
    install(home);

    const binary = path.join(home, '.claude', 'skills', 'browse', 'dist', 'browse');
    const haveBinary = fs.existsSync(binary);

    for (const skill of BINARY_DEPENDENT) {
      const installed = fs.existsSync(path.join(home, '.claude', 'skills', skill, 'SKILL.md'));
      if (installed) {
        assert(haveBinary,
          `${skill} was installed but ${binary} is missing — the skill would tell the `
          + 'model to run something that is not there');
      }
    }
  })],

  ['the install reports what it did about the binary', () => withTempHome(home => {
    const out = install(home);
    assert(/browse/i.test(out), 'install output must mention the browse binary decision');
  })],

  // Whichever branch runs, doctor must be clean. A fresh install that greets a
  // new user with a FAIL is the failure this whole file exists to prevent.
  ['doctor reports no dangling skill references after a fresh install', () => withTempHome(home => {
    install(home);
    let out = '';
    try {
      out = execFileSync('node', [path.join(REPO, 'scripts', 'ci', 'validate-skill-refs.js')], {
        encoding: 'utf8', cwd: REPO, env: { ...process.env, HOME: home },
      });
    } catch (err) {
      out = String((err.stdout || '') + (err.stderr || ''));
      assert.fail(`validate-skill-refs failed on a fresh install:\n${out}`);
    }
    assert(!/dangling/i.test(out), `dangling references on a fresh install:\n${out}`);
  })],

  ['skills without a binary dependency always install', () => withTempHome(home => {
    install(home);
    for (const skill of ['code-review', 'spec-driven-development']) {
      assert(
        fs.existsSync(path.join(home, '.claude', 'skills', skill, 'SKILL.md')),
        `${skill} has no binary dependency and must always install`
      );
    }
  })],
];

// THE case the bug actually lived in: a clone without the binary. Every case
// above passes trivially on a machine that happens to have it — which is exactly
// why this went unnoticed for three versions. Reproduce the fresh-clone
// condition by moving the binary aside, and restore it no matter what happens.
if (binaryPresent) {
  cases.push(['with the binary ABSENT, browse and qa are skipped, not shipped broken', () => {
    const binary = path.join(REPO, 'skills', 'browse', 'dist', 'browse');
    const stashed = path.join(os.tmpdir(), `browse-binary-stash-${process.pid}`);

    fs.renameSync(binary, stashed);
    try {
      withTempHome(home => {
        install(home);

        for (const skill of BINARY_DEPENDENT) {
          assert(
            !fs.existsSync(path.join(home, '.claude', 'skills', skill, 'SKILL.md')),
            `${skill} was installed without its binary — it would tell the model to run `
            + 'an executable that does not exist'
          );
        }

        // Skipping two skills is not an error: the rest must still install.
        assert(
          fs.existsSync(path.join(home, '.claude', 'scripts', 'hooks', 'cc-safety-net.js')),
          'the rest of the harness must still install'
        );
      });
    } finally {
      fs.renameSync(stashed, binary); // restore unconditionally
    }
  }]);

  cases.push(['the binary is restored after that test', () => {
    assert(
      fs.existsSync(path.join(REPO, 'skills', 'browse', 'dist', 'browse')),
      'the previous test must not leave the repo without its binary'
    );
  }]);

  cases.push(['with the binary available, browse and qa are installed', () => withTempHome(home => {
    install(home);
    for (const skill of BINARY_DEPENDENT) {
      assert(
        fs.existsSync(path.join(home, '.claude', 'skills', skill, 'SKILL.md')),
        `${skill} should install when the binary is available`
      );
    }
  })]);
}

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
console.log(`\nbrowse-build: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
