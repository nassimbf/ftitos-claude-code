#!/usr/bin/env node
/**
 * Tests for hooks/scripts/write-shrink-guard.js
 *
 * Ported from open-gsd/gsd-core's gsd-write-guard.js, whose header documents the
 * failure this exists to prevent: an agent read an advisory telling it not to
 * overwrite a curated file, classified the advisory as non-binding, and reasoned
 * past it. The lesson is not "write a firmer advisory" — it is that an instruction
 * is a thing a model can decide about, and a hook is not.
 *
 * Scope is deliberately narrow. Write replaces a whole file, so a Write that lands
 * far shorter than what is on disk is the shape of an accidental truncation. Edit
 * is surgical and is not covered. Growth is never blocked. Only curated artifacts
 * — the files that hold decisions rather than code — are in scope.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'write-shrink-guard.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shrink-guard-'));
const lines = n => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n');

function run(file, content, tool = 'Write') {
  const payload = JSON.stringify({
    tool_name: tool,
    tool_input: { file_path: file, content },
  });
  const res = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  let parsed = {};
  try { parsed = JSON.parse(res.stdout || '{}'); } catch { /* non-JSON = no decision */ }
  return parsed.decision === 'block';
}

function seed(name, n) {
  const f = path.join(tmp, name);
  fs.writeFileSync(f, lines(n));
  return f;
}

const cases = [
  ['blocks a Write that guts a curated file', () => {
    const f = seed('MEMORY.md', 100);
    assert(run(f, lines(10)), '100 lines -> 10 must block');
  }],

  ['allows a Write that grows a curated file', () => {
    const f = seed('CLAUDE.md', 50);
    assert(!run(f, lines(200)), 'growth must never block');
  }],

  ['allows a modest shrink above the floor', () => {
    const f = seed('TIER.md', 100);
    assert(!run(f, lines(80)), '80% retained is ordinary editing');
  }],

  ['ignores files that are not curated artifacts', () => {
    const f = seed('server.js', 400);
    assert(!run(f, lines(3)), 'source files are the git repo\'s problem, not this hook\'s');
  }],

  ['ignores Edit — it does not replace the file', () => {
    const f = seed('PLAN.md', 100);
    assert(!run(f, lines(2), 'Edit'), 'Edit is surgical; only Write replaces wholesale');
  }],

  ['allows creating a new curated file', () => {
    assert(!run(path.join(tmp, 'ROADMAP.md'), lines(3)), 'nothing on disk means nothing to lose');
  }],

  ['a sentinel unblocks exactly one write, then is gone', () => {
    const f = seed('CONTEXT.md', 100);
    assert(run(f, lines(5)), 'blocked before the sentinel exists');

    const sentinel = path.join(path.dirname(f), '.allow-shrink-CONTEXT.md');
    fs.writeFileSync(sentinel, '');
    assert(!run(f, lines(5)), 'sentinel must permit the write');
    assert(!fs.existsSync(sentinel), 'sentinel must be consumed, not left armed');
    assert(run(f, lines(5)), 'the next write is blocked again');
  }],

  ['a sentinel is bound to its own path', () => {
    const a = seed('STATE.md', 100);
    const b = seed('DECISIONS.md', 100);
    fs.writeFileSync(path.join(tmp, '.allow-shrink-STATE.md'), '');
    assert(run(b, lines(4)), 'a sentinel for STATE.md must not unblock DECISIONS.md');
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
console.log(`\nwrite-shrink-guard: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
