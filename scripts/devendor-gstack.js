#!/usr/bin/env node
/**
 * Decouple vendored gstack skills from the gstack suite.
 *
 * cso, browse and qa were vendored standalone, but they are written to run as
 * part of the full gstack install: 34 fenced references pointed at
 * ~/.claude/skills/gstack/..., which does not exist here. The model would read
 * each instruction, run it, get "no such file", and improvise.
 *
 * Two kinds of reference, two treatments:
 *
 *   RETARGET — things the skill genuinely needs, which we vendored alongside it
 *              (the compiled browse driver, the egress allowlist library). Point
 *              them at their real location.
 *
 *   NEUTRALISE — gstack suite infrastructure we deliberately did not vendor:
 *              skill-start/end telemetry, the learnings and decision brain, the
 *              question registry, and gstack-config (630 lines reading
 *              ~/.gstack/config.yaml). Replace the command with a comment so the
 *              surrounding instructions still read correctly but nothing is
 *              invoked.
 *
 * Idempotent. Re-run after re-vendoring from upstream.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', 'skills');

const RETARGET = [
  [/(~|\$HOME)\/\.claude\/skills\/gstack\/browse\//g, '$1/.claude/skills/browse/'],
  [/(~|\$HOME)\/\.claude\/skills\/gstack\/(cso|qa)\//g, '$1/.claude/skills/$2/'],
  [/(~|\$HOME)\/\.claude\/skills\/gstack\/bin\/gstack-egress-lib\.sh/g,
    '$1/.claude/skills/browse/bin/gstack-egress-lib.sh'],
];

// Suite-only binaries. Anything still pointing at gstack/bin after RETARGET.
const SUITE_BIN = /(?:~|\$HOME|\.)?\/?\.claude\/skills\/gstack\/bin\/(gstack-[a-z-]+(?:\.sh)?)/;

function neutraliseLine(line) {
  const m = line.match(SUITE_BIN);
  if (!m) return line;
  const indent = (line.match(/^\s*/) || [''])[0];
  return `${indent}# (${m[1]} is gstack-suite infrastructure — not vendored here, step skipped)`;
}

let changed = 0;
let retargeted = 0;
let neutralised = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!entry.name.endsWith('.md')) continue;

    const before = fs.readFileSync(p, 'utf8');
    let text = before;

    // `preamble-tier` gates a ~12k-token gstack-specific preamble (skill-start
    // handshakes, onboarding directives, analytics appends). We neutralise those
    // calls, so the field is dead metadata — and frontmatter is always-on, so
    // dead metadata here is not free.
    text = text.replace(/^preamble-tier:.*\r?\n/m, '');
    for (const [re, to] of RETARGET) {
      const hits = (text.match(re) || []).length;
      if (hits) { retargeted += hits; text = text.replace(re, to); }
    }

    // Neutralise only inside fences — prose mentions are documentation.
    const lines = text.split('\n');
    let inFence = false;
    for (let i = 0; i < lines.length; i += 1) {
      if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
      if (!inFence) continue;
      const next = neutraliseLine(lines[i]);
      if (next !== lines[i]) { neutralised += 1; lines[i] = next; }
    }
    text = lines.join('\n');

    if (text !== before) { fs.writeFileSync(p, text); changed += 1; }
  }
}

walk(skillsDir);
console.log(`devendor-gstack: ${changed} file(s) — ${retargeted} retargeted, ${neutralised} neutralised`);
