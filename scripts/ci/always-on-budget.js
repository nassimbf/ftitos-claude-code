#!/usr/bin/env node
/**
 * Price the always-on surface, per file, against a recorded baseline.
 *
 * Ported from open-gsd/gsd-core's tests/agent-size-budget.test.cjs.
 *
 * The rule this replaces was "ship at most 8 skills". That is a proxy: it counts
 * things instead of measuring the resource, so it blocks a 66-token skill while
 * a single skill whose description grows by 400 tokens passes unnoticed. What is
 * actually scarce is always-on context — the frontmatter of every skill, agent
 * and command, scanned on every session, plus the rules files loaded in full.
 *
 * So measure that. Growth fails with the file and the delta named. Deliberate
 * growth is recorded by rewriting the baseline, which shows up in review as a
 * one-line diff saying exactly what it now costs.
 *
 *   node always-on-budget.js            check against baseline
 *   node always-on-budget.js --write    record current sizes as the new baseline
 *
 * Usage note: the hard ceiling still exists (doctor fails past 8,000). This is
 * the finer instrument — it catches the 200-token creep that never trips a
 * ceiling but spends the budget just as surely.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const BASELINE = path.join(__dirname, 'always-on-baseline.json');
const CEILING_TOKENS = 8000;

// Frontmatter is always-on for these; bodies load on demand.
const FRONTMATTER_DIRS = ['skills', 'agents'];
// Rules files are loaded in full, every session.
const FULL_FILE_DIRS = ['rules'];

const tok = bytes => Math.round(bytes / 4);

function frontmatterBytes(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? Buffer.byteLength(m[1]) : 0;
}

function measure() {
  const sizes = {};

  for (const dir of FRONTMATTER_DIRS) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const file = entry.isDirectory()
        ? path.join(base, entry.name, 'SKILL.md')
        : path.join(base, entry.name);
      if (!file.endsWith('.md') || !fs.existsSync(file)) continue;
      sizes[path.relative(root, file)] = frontmatterBytes(file);
    }
  }

  for (const dir of FULL_FILE_DIRS) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const f of fs.readdirSync(base)) {
      if (!f.endsWith('.md')) continue;
      const file = path.join(base, f);
      sizes[path.relative(root, file)] = fs.statSync(file).size;
    }
  }

  return sizes;
}

const current = measure();
const total = tok(Object.values(current).reduce((a, b) => a + b, 0));

if (process.argv.includes('--write')) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({ totalTokens: total, sizes: current }, null, 2)}\n`);
  console.log(`always-on-budget: baseline recorded — ${total} tokens across ${Object.keys(current).length} files`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('always-on-budget: no baseline. Run with --write to record one.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const problems = [];

for (const [file, bytes] of Object.entries(current)) {
  const was = baseline.sizes[file];
  if (was === undefined) {
    problems.push(`+ ${file} is new and costs ${tok(bytes)} tok always-on`);
  } else if (bytes > was) {
    problems.push(`↑ ${file} grew ${tok(bytes - was)} tok (${tok(was)} → ${tok(bytes)})`);
  }
}

if (total > CEILING_TOKENS) {
  problems.push(`TOTAL ${total} tok exceeds the ${CEILING_TOKENS} ceiling`);
}

if (problems.length === 0) {
  const shrunk = Object.keys(baseline.sizes).filter(f => current[f] === undefined);
  const note = shrunk.length ? ` (${shrunk.length} file(s) removed)` : '';
  console.log(`always-on-budget: ${total} tok, within baseline ${baseline.totalTokens}${note}`);
  process.exit(0);
}

console.error(`always-on-budget: always-on surface grew — ${total} tok (baseline ${baseline.totalTokens})\n`);
for (const p of problems) console.error(`  ${p}`);
console.error(
  `\nIf the growth is deliberate, record it:  node scripts/ci/always-on-budget.js --write` +
  `\nThat writes the new cost into the baseline, where review can see it.`
);
process.exit(1);
