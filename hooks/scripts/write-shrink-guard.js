#!/usr/bin/env node
/**
 * PreToolUse Hook: refuse a Write that guts a curated artifact.
 *
 * Ported from open-gsd/gsd-core's gsd-write-guard.js. Its header documents the
 * incident worth repeating here: an agent read an advisory telling it not to
 * overwrite a curated file, classified the advisory as non-binding, and reasoned
 * past it. The repair is not a firmer sentence. An instruction is a thing a model
 * can form a view about; a hook is not.
 *
 * Curated artifacts are the files holding decisions rather than code — memory,
 * plans, context, doctrine. Source files are excluded on purpose: git already
 * guards those, and a truncated module fails loudly at import. A gutted MEMORY.md
 * fails silently, months later, as something you no longer remember deciding.
 *
 * Write replaces a file wholesale, so a Write landing far shorter than what is on
 * disk has the shape of an accidental truncation. Edit is surgical and out of
 * scope. Growth is never blocked.
 *
 * The escape hatch is a sentinel file next to the target: deliberate (you create
 * it), path-bound (it names one file), single-use (it is consumed), and auditable
 * (it appears in the log). Deliberately more work than editing a sentence.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readStdinJson, output, log } = require('./lib/utils');

// Fraction of the on-disk line count a Write must retain to pass unchallenged.
// GSD uses 40%. Below this, a whole-file replacement is treated as truncation.
const RETENTION_FLOOR = 0.4;

// Files that carry decisions. Matched on basename so they are found wherever a
// project puts them. `memory/*.md` is matched by directory instead.
const CURATED_NAMES = new Set([
  'MEMORY.md', 'CLAUDE.md', 'TIER.md', 'PLAN.md', 'CONTEXT.md',
  'ROADMAP.md', 'STATE.md', 'DECISIONS.md', 'SPEC.md', 'CHANGELOG.md',
]);

function isCurated(filePath) {
  const base = path.basename(filePath);
  if (CURATED_NAMES.has(base)) return true;
  // Any markdown note living in a memory/ directory is curated by definition.
  return base.endsWith('.md') && path.dirname(filePath).split(path.sep).includes('memory');
}

function sentinelFor(filePath) {
  return path.join(path.dirname(filePath), `.allow-shrink-${path.basename(filePath)}`);
}

function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

async function main() {
  const input = await readStdinJson();
  if (!input) return output({});

  const tool = input.tool_name;
  // Only Write replaces a whole file. Edit and NotebookEdit are surgical.
  if (tool !== 'Write') return output({});

  const filePath = input.tool_input && input.tool_input.file_path;
  const content = (input.tool_input && input.tool_input.content) || '';
  if (!filePath || !isCurated(filePath)) return output({});

  let existing;
  try {
    existing = fs.readFileSync(filePath, 'utf8');
  } catch {
    return output({}); // No file on disk: creation has nothing to lose.
  }

  const before = countLines(existing);
  const after = countLines(content);
  if (before === 0 || after >= before * RETENTION_FLOOR) return output({});

  // Below the floor. Honour a sentinel once, then disarm it so the next write
  // is judged on its own merits rather than inheriting a standing exemption.
  const sentinel = sentinelFor(filePath);
  if (fs.existsSync(sentinel)) {
    try { fs.unlinkSync(sentinel); } catch { /* best effort */ }
    log(`write-shrink-guard: sentinel consumed for ${filePath} (${before} -> ${after} lines)`);
    return output({});
  }

  const pct = Math.round((after / before) * 100);
  log(`write-shrink-guard: blocked ${filePath} (${before} -> ${after} lines, ${pct}%)`);
  return output({
    decision: 'block',
    reason:
      `write-shrink-guard: this Write would cut ${path.basename(filePath)} from ${before} lines to ` +
      `${after} (${pct}%), and it is a curated artifact. Write replaces the whole file, so anything ` +
      `you did not carry over is gone. If you meant to change part of it, use Edit. If you truly ` +
      `meant to replace it, create ${sentinel} and repeat the Write — that sentinel is consumed once.`,
  });
}

main();
