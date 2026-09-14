#!/usr/bin/env node
/**
 * Port a gsd-core agent into this harness, with its references.
 *
 * gsd agents carry their substance in @-included reference files — gsd-debugger
 * is 1,279 lines that @-include 1,288 more, and the included half holds the
 * spectrum-based fault localisation and the falsifiability method that are most
 * of its value. Copy the agent alone and you get a confident-sounding skeleton.
 * validate-skill-refs.js now fails that, which is why it was written first.
 *
 * The references themselves have no gsd coupling — checked, zero hits for
 * gsd-tools or /gsd: across all nine debugger references. Only the agent shell
 * needs rewriting.
 *
 * Idempotent. Usage: node port-gsd-agent.js <gsd-agent-name> <local-name>
 *   e.g. node port-gsd-agent.js gsd-debugger debugger
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = '/tmp/repos/gsd';
const root = path.join(__dirname, '..');
const [srcName, dstName] = process.argv.slice(2);

if (!srcName || !dstName) {
  console.error('usage: node port-gsd-agent.js <gsd-agent-name> <local-name>');
  process.exit(1);
}

const srcAgent = path.join(SRC, 'agents', `${srcName}.md`);
if (!fs.existsSync(srcAgent)) {
  console.error(`no such agent: ${srcAgent}`);
  process.exit(1);
}

const refsOut = path.join(root, 'agents', 'references');
fs.mkdirSync(refsOut, { recursive: true });

let text = fs.readFileSync(srcAgent, 'utf8');

// Vendor the TRANSITIVE closure. References @-include other references —
// nyquist-compliance pulls failing-direction, thinking-models-planning pulls
// planner-reversibility — so a one-level copy leaves dangling includes inside
// the files it just vendored. Found by validate-skill-refs on the first run.
const UPSTREAM_REFS = path.join(SRC, 'gsd-core', 'references');
const includesIn = body => (body.match(/@[A-Za-z0-9._~/-]+\.md/g) || []).map(r => r.slice(1));

// Resolve a reference to its path relative to gsd-core/references/. Includes
// arrive in three shapes — bare, gsd-core/references/x, ~/.claude/gsd-core/
// references/x — and some sit in a subdirectory (few-shot-examples/verifier.md)
// that must be preserved or same-named files collide. Take everything after the
// last "references/"; otherwise the basename.
const relOf = ref => {
  const marker = ref.lastIndexOf('references/');
  return marker === -1 ? path.basename(ref) : ref.slice(marker + 'references/'.length);
};

const vendored = [];
const missing = [];
const seen = new Set();
const queue = includesIn(text);

while (queue.length) {
  const ref = queue.shift();
  const rel = relOf(ref);
  if (seen.has(rel)) continue;
  seen.add(rel);

  const from = path.join(UPSTREAM_REFS, rel);
  if (!fs.existsSync(from)) { missing.push(rel); continue; }

  const to = path.join(refsOut, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  let body = fs.readFileSync(from, 'utf8');
  queue.push(...includesIn(body));
  // Rewrite inside the reference too, so its own includes resolve locally.
  body = body.replace(/@(?:~\/\.claude\/)?(?:gsd-core\/)?references\//g, '@');
  fs.writeFileSync(to, body);
  vendored.push(rel);
}

// Rewrite includes to the vendored location, relative to agents/.
text = text.replace(/@(?:~\/\.claude\/)?(?:gsd-core\/)?references\//g, '@references/');

// Drop includes we could not vendor — an unresolvable include is worse than an
// absent one, because the agent reads as though the guidance were present.
for (const ref of missing) {
  text = text.replace(new RegExp(`^.*@references/${ref.replace('.', '\\.')}.*$\\n?`, 'gm'), '');
}

// gsd orchestration names → ours. `.planning/` is left alone: build-phases
// already uses that layout, so .planning/debug/ lands in the right place.
text = text
  .replace(/^name:\s*.*$/m, `name: ${dstName}`)
  .replace(/\/gsd:debug/g, '/debug')
  .replace(/\/gsd:([a-z-]+)/g, '/$1')
  .replace(/^.*gsd-tools(\.cjs|\.md)?.*$\n?/gm, '');

const dst = path.join(root, 'agents', `${dstName}.md`);
fs.writeFileSync(dst, text);

console.log(`ported ${srcName} → agents/${dstName}.md`);
console.log(`  references vendored: ${vendored.length}${vendored.length ? ` (${vendored.join(', ')})` : ''}`);
if (missing.length) console.log(`  includes dropped (not in upstream references/): ${missing.join(', ')}`);
