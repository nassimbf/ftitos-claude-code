#!/usr/bin/env node
/**
 * Tests for scripts/ci/validate-skill-refs.js
 *
 * The bug this exists to make impossible:
 *
 *   /go referenced 17 commands. Ten did not exist. It stayed broken for months
 *   because nothing checked, and a dangling reference fails silently — the model
 *   reads the instruction, runs the command, gets "no such file", and improvises.
 *
 *   Then, hours after diagnosing that, vendoring three skills from gstack
 *   introduced 67 references to ~/.claude/skills/gstack/ — a path that does not
 *   exist here, because those skills expect to be installed as a suite.
 *
 * Same defect twice in one day, found by hand both times. So: a check.
 *
 * Design borrowed from JuliusBrussee/caveman's verbs-gate.mjs — fail CLOSED on an
 * unresolvable reference inside a code fence, ignore prose. A path named in prose
 * is documentation; a path in a fence is something the model will run.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const VALIDATOR = path.join(__dirname, '..', 'scripts', 'ci', 'validate-skill-refs.js');

function harness(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-refs-'));
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return root;
}

function check(root) {
  const res = spawnSync('node', [VALIDATOR, root], { encoding: 'utf8' });
  return { ok: res.status === 0, out: (res.stdout || '') + (res.stderr || '') };
}

const cases = [
  ['a skill referencing only paths that exist passes', () => {
    const root = harness({
      'skills/alpha/SKILL.md': '---\nname: alpha\n---\n\nRun it:\n\n```bash\n~/.claude/skills/alpha/bin/go\n```\n',
      'skills/alpha/bin/go': '#!/bin/sh\n',
    });
    assert(check(root).ok);
  }],

  ['a reference to a skill that is not installed fails', () => {
    const root = harness({
      'skills/cso/SKILL.md': '---\nname: cso\n---\n\n```bash\n~/.claude/skills/gstack/bin/gstack-skill-end --skill cso\n```\n',
    });
    const { ok, out } = check(root);
    assert(!ok, 'must fail');
    assert(/gstack/.test(out), `must name the missing path, got: ${out}`);
    assert(/SKILL\.md/.test(out), 'must name the file');
  }],

  ['a reference to a sibling skill that IS installed passes', () => {
    const root = harness({
      'skills/qa/SKILL.md': '---\nname: qa\n---\n\n```bash\n~/.claude/skills/browse/src/cli.ts\n```\n',
      'skills/browse/src/cli.ts': '// driver\n',
    });
    assert(check(root).ok, 'cross-skill references are legitimate when the target exists');
  }],

  ['a path mentioned in PROSE is documentation, not an invocation', () => {
    const root = harness({
      'skills/alpha/SKILL.md':
        '---\nname: alpha\n---\n\nUpstream installs this at ~/.claude/skills/gstack/bin/whatever, which we do not use.\n',
    });
    assert(check(root).ok, 'prose must not fail the gate — only fenced code');
  }],

  ['it reports every dangling reference, not just the first', () => {
    const root = harness({
      'skills/a/SKILL.md': '---\nname: a\n---\n\n```bash\n~/.claude/skills/ghost/bin/one\n~/.claude/skills/ghost/bin/two\n```\n',
    });
    const { ok, out } = check(root);
    assert(!ok);
    assert(/one/.test(out) && /two/.test(out), `both must be listed, got: ${out}`);
  }],

  ['no skills directory is not an error', () => {
    const root = harness({ 'README.md': 'nothing here\n' });
    assert(check(root).ok);
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
console.log(`\nskill-refs: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
