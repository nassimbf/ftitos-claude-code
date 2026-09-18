#!/usr/bin/env node
/**
 * Validate .planning/phases/ for conflicts that break parallel execution.
 *
 * The planning model is ported from open-gsd/gsd-core. Plans declare `wave`,
 * `depends_on` and `files_modified` so plans in the same wave may run at once.
 * That guarantee is only worth anything if something checks it — otherwise "these
 * plans are independent" is an unverified claim, and two agents edit one file in
 * parallel and silently lose half the work.
 *
 * Exit 0 = safe to fan out. Exit 1 = conflicts printed, one per line.
 *
 * Usage: node plan-check.js [project-root]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.argv[2] || process.cwd();
const phasesDir = path.join(root, '.planning', 'phases');

// A project with no phases is not a broken project.
if (!fs.existsSync(phasesDir)) process.exit(0);

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.replace(/\s+#.*$/, '').trim();
    if (value.startsWith('[')) {
      try { out[key] = JSON.parse(value.replace(/'/g, '"')); } catch { out[key] = []; }
    } else if (/^\d+$/.test(value)) {
      out[key] = Number(value);
    } else {
      out[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

function collectPlans(dir) {
  const plans = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { plans.push(...collectPlans(p)); continue; }
    if (!/-PLAN\.md$/.test(entry.name)) continue;
    const fm = parseFrontmatter(fs.readFileSync(p, 'utf8'));
    if (!fm) continue;
    plans.push({
      id: entry.name.replace(/-PLAN\.md$/, ''),
      file: path.relative(root, p),
      wave: fm.wave || 1,
      dependsOn: fm.depends_on || [],
      modified: fm.files_modified || [],
      deleted: fm.files_deleted || [],
      requirements: fm.requirements || [],
      // "<peer-id>: reason" — a deliberate, order-independent same-wave overlap.
      coupledWith: new Set((fm.coupling_justified || []).map(s => String(s).split(':')[0].trim())),
    });
  }
  return plans;
}

const plans = collectPlans(phasesDir);
const byId = new Map(plans.map(p => [p.id, p]));
const problems = [];

for (const plan of plans) {
  // Work that traces to no requirement is work nobody asked for.
  if (plan.requirements.length === 0) {
    problems.push(`${plan.file}: no requirements declared — every plan must trace to a ROADMAP requirement`);
  }

  for (const dep of plan.dependsOn) {
    const target = byId.get(dep);
    if (!target) {
      problems.push(`${plan.file}: depends_on "${dep}", which does not exist`);
      continue;
    }
    // A dependency must finish first, so it must live in an earlier wave.
    if (target.wave >= plan.wave) {
      problems.push(
        `${plan.file}: depends_on "${dep}" but that plan is in wave ${target.wave} and this is wave ${plan.wave} — a dependency cannot run in the same or a later wave`
      );
    }
  }
}

// Within a wave, no two plans may touch the same path unless both declared the
// coupling deliberately.
const waves = new Map();
for (const plan of plans) {
  if (!waves.has(plan.wave)) waves.set(plan.wave, []);
  waves.get(plan.wave).push(plan);
}

for (const [wave, group] of waves) {
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      const [a, b] = [group[i], group[j]];
      if (a.coupledWith.has(b.id) && b.coupledWith.has(a.id)) continue;

      const aTouches = new Set([...a.modified, ...a.deleted]);
      const shared = [...new Set([...b.modified, ...b.deleted])].filter(f => aTouches.has(f));
      for (const file of shared) {
        const deleteRace = a.deleted.includes(file) || b.deleted.includes(file);
        problems.push(
          deleteRace
            ? `wave ${wave}: ${a.id} and ${b.id} race on "${file}" — one deletes it while the other edits it`
            : `wave ${wave}: ${a.id} and ${b.id} both modify "${file}" — they cannot run in parallel`
        );
      }
    }
  }
}

if (problems.length === 0) {
  console.log(`plan-check: ${plans.length} plan(s), no conflicts — safe to fan out`);
  process.exit(0);
}

console.error(`plan-check: ${problems.length} conflict(s) in ${plans.length} plan(s)\n`);
for (const p of problems) console.error(`  ${p}`);
console.error(`\nFix these before running plans in parallel, or move one to a later wave.`);
process.exit(1);
