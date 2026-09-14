#!/usr/bin/env node
/**
 * Tests for skills/build-phases/scripts/plan-check.js
 *
 * The planning model is ported from open-gsd/gsd-core's .planning/ layer. Their
 * phase plans declare `wave`, `depends_on` and `files_modified` so that plans in
 * the same wave can run in parallel. That only holds if something CHECKS it —
 * otherwise "these two plans are independent" is a claim nobody verified, and
 * two agents edit the same file in parallel.
 *
 * This is the check. It is the reason the workflow is a skill plus a script
 * rather than a skill alone.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CHECK = path.join(__dirname, '..', 'skills', 'build-phases', 'scripts', 'plan-check.js');

function project(plans) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-check-'));
  for (const [id, fm] of Object.entries(plans)) {
    const dir = path.join(root, '.planning', 'phases', `0${id.split('-')[0]}-x`);
    fs.mkdirSync(dir, { recursive: true });
    const body = Object.entries(fm)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? JSON.stringify(v) : v}`)
      .join('\n');
    fs.writeFileSync(path.join(dir, `${id}-PLAN.md`), `---\n${body}\n---\n\n# Plan ${id}\n`);
  }
  return root;
}

function check(root) {
  const res = spawnSync('node', [CHECK, root], { encoding: 'utf8' });
  return { ok: res.status === 0, out: (res.stdout || '') + (res.stderr || '') };
}

const base = { phase: '01-x', wave: 1, depends_on: [], files_modified: [], requirements: ['R1'] };

const cases = [
  ['a clean plan set passes', () => {
    const r = project({
      '01-01': { ...base, files_modified: ['src/a.js'] },
      '01-02': { ...base, files_modified: ['src/b.js'] },
    });
    assert(check(r).ok, 'independent plans in one wave are fine');
  }],

  ['two plans in the same wave touching one file is a collision', () => {
    const r = project({
      '01-01': { ...base, files_modified: ['src/shared.js'] },
      '01-02': { ...base, files_modified: ['src/shared.js'] },
    });
    const { ok, out } = check(r);
    assert(!ok, 'must fail');
    assert(/shared\.js/.test(out), `must name the file, got: ${out}`);
  }],

  ['the same file in DIFFERENT waves is fine — they are ordered', () => {
    const r = project({
      '01-01': { ...base, wave: 1, files_modified: ['src/shared.js'] },
      '01-02': { ...base, wave: 2, depends_on: ['01-01'], files_modified: ['src/shared.js'] },
    });
    assert(check(r).ok, 'sequential edits to one file are legitimate');
  }],

  ['a dependency on a plan that does not exist fails', () => {
    const r = project({ '01-01': { ...base, wave: 2, depends_on: ['01-99'] } });
    const { ok, out } = check(r);
    assert(!ok);
    assert(/01-99/.test(out), `must name the missing plan, got: ${out}`);
  }],

  ['depending on a plan in the same or later wave fails', () => {
    const r = project({
      '01-01': { ...base, wave: 2 },
      '01-02': { ...base, wave: 2, depends_on: ['01-01'] },
    });
    const { ok, out } = check(r);
    assert(!ok, 'a dependency cannot run concurrently with its dependent');
    assert(/wave/i.test(out), `must explain, got: ${out}`);
  }],

  ['a plan with no requirements fails', () => {
    const r = project({ '01-01': { ...base, requirements: [] } });
    const { ok, out } = check(r);
    assert(!ok, 'work not traceable to a requirement is work nobody asked for');
    assert(/requirement/i.test(out));
  }],

  ['deleting a file another plan edits in the same wave fails', () => {
    const r = project({
      '01-01': { ...base, files_deleted: ['src/old.js'] },
      '01-02': { ...base, files_modified: ['src/old.js'] },
    });
    const { ok, out } = check(r);
    assert(!ok, 'delete racing an edit');
    assert(/old\.js/.test(out));
  }],

  ['a declared coupling exempts an intentional same-wave pair', () => {
    const r = project({
      '01-01': { ...base, files_modified: ['cfg.json'], coupling_justified: ['01-02: append distinct keys'] },
      '01-02': { ...base, files_modified: ['cfg.json'], coupling_justified: ['01-01: append distinct keys'] },
    });
    assert(check(r).ok, 'deliberate, documented coupling is allowed');
  }],

  ['no .planning directory is not an error', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-check-empty-'));
    assert(check(root).ok, 'a project without phases must not fail the gate');
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
console.log(`\nplan-check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
