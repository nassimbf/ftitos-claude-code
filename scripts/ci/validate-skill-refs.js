#!/usr/bin/env node
/**
 * Fail on a skill that tells the model to run something which does not exist.
 *
 * Twice in one day a dangling reference shipped and stayed invisible:
 *
 *   /go referenced 17 commands, ten of them missing, for months.
 *   Vendoring cso/browse/qa introduced 67 references to ~/.claude/skills/gstack/,
 *   a suite path that does not exist in a standalone vendoring.
 *
 * Neither failed loudly. The model reads the instruction, runs the command, gets
 * "no such file", and improvises — which looks like the model being unreliable
 * rather than the skill being wrong.
 *
 * Design from JuliusBrussee/caveman's verbs-gate.mjs: fail CLOSED on an
 * unresolvable reference inside a fenced code block; ignore prose. A path in
 * prose is documentation. A path in a fence is something that will be executed.
 *
 * Usage: node validate-skill-refs.js [repo-root]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.argv[2] || path.join(__dirname, '..', '..');
const skillsDir = path.join(root, 'skills');
const agentsDir = path.join(root, 'agents');

if (!fs.existsSync(skillsDir) && !fs.existsSync(agentsDir)) process.exit(0);

// Referenced install paths are rooted at the skills directory: the repo's
// skills/ is what becomes ~/.claude/skills/ at install time.
const INSTALL_PREFIX = /(?:~|\$HOME)\/\.claude\/skills\//;

function markdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// Only lines inside ``` fences are executable context.
function fencedLines(text) {
  const lines = text.split('\n');
  const out = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) out.push([i + 1, lines[i]]);
  }
  return out;
}

const problems = [];

// Agents pull in reference files with `@path`. An agent copied without its
// references does not fail loudly — it becomes a confident-sounding skeleton,
// which is worse than a missing file. Checked outside fences too, because an
// @-include is an instruction wherever it appears.
if (fs.existsSync(agentsDir)) {
  for (const file of markdownFiles(agentsDir)) {
    const text = fs.readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      // Preceded by start-of-line or whitespace, so an email address is not a hit.
      const matches = line.match(/(?:^|\s)@([A-Za-z0-9._~/-]+\.md)\b/g);
      if (!matches) return;
      for (const raw of matches) {
        const ref = raw.trim().slice(1);
        const candidates = [
          path.resolve(path.dirname(file), ref),
          path.join(agentsDir, ref),
          path.join(root, ref.replace(/^(~|\$HOME)\/\.claude\//, '')),
        ];
        if (!candidates.some(c => fs.existsSync(c))) {
          problems.push(`${path.relative(root, file)}:${i + 1}  @${ref}`);
        }
      }
    });
  }
}

for (const file of fs.existsSync(skillsDir) ? markdownFiles(skillsDir) : []) {
  for (const [lineNo, line] of fencedLines(fs.readFileSync(file, 'utf8'))) {
    const matches = line.match(new RegExp(`(?:~|\\$HOME)/\\.claude/skills/[A-Za-z0-9._/-]+`, 'g'));
    if (!matches) continue;
    for (const ref of matches) {
      const rel = ref.replace(INSTALL_PREFIX, '');
      const target = path.join(skillsDir, rel);
      // A reference may omit an extension (a section doc, a built binary).
      // Accept the path, or the path plus any single extension.
      const dir = path.dirname(target);
      const base = path.basename(target);
      let found = fs.existsSync(target);
      if (!found && fs.existsSync(dir)) {
        found = fs.readdirSync(dir).some(f => f === base || f.startsWith(`${base}.`));
      }
      if (!found) {
        problems.push(`${path.relative(root, file)}:${lineNo}  ${ref}`);
      }
    }
  }
}

if (problems.length === 0) {
  console.log('validate-skill-refs: all skill and agent references resolve');
  process.exit(0);
}

console.error(`validate-skill-refs: ${problems.length} dangling reference(s)\n`);
for (const p of problems) console.error(`  ${p}`);
console.error(
  `\nEach of these tells the model to run something that is not installed. Either vendor` +
  `\nthe target, rewrite the path, or move the mention out of the code fence into prose.`
);
process.exit(1);
