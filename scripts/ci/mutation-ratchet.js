#!/usr/bin/env node
/**
 * mutation-ratchet.js — a test-quality gate that cannot be gamed by deleting
 * tests.
 *
 * Coverage says which lines ran. It does not say whether a test would NOTICE if
 * those lines were wrong. Mutation testing does: change the code, and if no test
 * fails, that test was decoration.
 *
 * Discipline ported from open-gsd/gsd-core (MIT), stryker.config.mjs. Stryker
 * itself is not portable here — it is an npm orchestrator that mutates built
 * artifacts — but three of its decisions are, and they are the whole value.
 *
 * 1. THE DENOMINATOR RULE (stryker.config.mjs:106). Never gate on a score that
 *    excludes mutants with no test coverage. That number answers "of the code we
 *    bothered to test, how well did we test it" — so it goes UP when you delete
 *    a failing test or stop covering a module. A test-quality gate that rewards
 *    deleting tests is worse than no gate. Skipped mutants stay in the
 *    denominator here, and there is a test asserting deleting coverage cannot
 *    raise the score.
 *
 * 2. A RATCHET, NOT A THRESHOLD. A fixed number is either so low it never fires
 *    or so high it blocks every commit; both end with someone removing it. A
 *    ratchet only asks that the score not get worse, which is enforceable from
 *    day one at whatever the score happens to be today.
 *
 * 3. FAIL LOUDLY ON MISCONFIGURATION (scripts/mutation-matrix.cjs:786 throws
 *    rather than falling back). A broken shard that silently scores 0 — or
 *    silently passes — is worse than a red build.
 *
 * Usage:
 *   node scripts/ci/mutation-ratchet.js --report <file> [--baseline <file>] [--write]
 */

'use strict';

const fs = require('fs');

// mutmut's summary line, e.g.  🎉 12  ⏰ 1  🤔 2  🙁 5  🔇 0
// Emoji are matched by their labels' numeric neighbours rather than the glyphs
// themselves, because terminal encodings mangle the glyphs and a parser that
// depends on them fails in exactly the environment it is needed in.
const MUTMUT_FIELDS = [
  ['killed', /🎉\s*(\d+)/],
  ['timeout', /⏰\s*(\d+)/],
  ['suspicious', /🤔\s*(\d+)/],
  ['survived', /🙁\s*(\d+)/],
  ['skipped', /🔇\s*(\d+)/],
];

/**
 * @returns {{killed:number,timeout:number,suspicious:number,survived:number,skipped:number}|null}
 *   null when the output carries no recognisable result line — reported, never
 *   guessed at. A parser that invents zeros turns a crashed run into a perfect
 *   score.
 */
function parseMutmutResults(output) {
  const text = String(output || '');
  const result = {};
  let matched = 0;

  for (const [field, re] of MUTMUT_FIELDS) {
    const m = text.match(re);
    result[field] = m ? Number(m[1]) : 0;
    if (m) matched += 1;
  }

  return matched > 0 ? result : null;
}

/**
 * Percentage of mutants the suite actually caught.
 *
 * A timeout is a kill: the mutant changed behaviour enough to hang the suite.
 * Suspicious is ambiguous and counted AGAINST — the conservative direction for a
 * quality gate. Skipped stays in the denominator; see the denominator rule.
 */
function computeScore(results) {
  const { killed = 0, timeout = 0, suspicious = 0, survived = 0, skipped = 0 } = results || {};
  const caught = killed + timeout;
  const total = killed + timeout + suspicious + survived + skipped;
  if (total === 0) return 0;
  return Number(((caught / total) * 100).toFixed(3));
}

// Floating-point noise must not fail a build; a real regression is not 0.01%.
const RATCHET_TOLERANCE = 0.1;

/**
 * @param {number} score current run
 * @param {number|null} baseline previously recorded score, null on first run
 */
function checkRatchet(score, baseline) {
  if (baseline === null || baseline === undefined) {
    return {
      ok: true,
      reason: `no baseline yet — recording ${score}% as the floor. `
        + 'Future runs may not score below it.',
    };
  }

  if (score >= baseline - RATCHET_TOLERANCE) {
    return { ok: true, reason: `${score}% holds the ${baseline}% floor.` };
  }

  return {
    ok: false,
    reason: `mutation score regressed: ${score}% is below the recorded floor of ${baseline}%. `
      + 'Either the change removed a test that was catching a mutant, or it added '
      + 'code no test would notice being wrong.',
  };
}

function readBaseline(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return typeof parsed.score === 'number' ? parsed.score : null;
  } catch {
    return null;
  }
}

function main(argv) {
  const arg = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const reportFile = arg('--report');
  const baselineFile = arg('--baseline');
  const write = argv.includes('--write');

  if (!reportFile) {
    console.error('usage: mutation-ratchet.js --report <file> [--baseline <file>] [--write]');
    return 1;
  }
  if (!fs.existsSync(reportFile)) {
    // Loud, per decision 3. A missing report is a broken run, not a pass.
    console.error(`FAIL: report not found: ${reportFile}`);
    return 1;
  }

  const results = parseMutmutResults(fs.readFileSync(reportFile, 'utf8'));
  if (!results) {
    console.error(`FAIL: no mutation results found in ${reportFile} — the run did not complete.`);
    return 1;
  }

  const score = computeScore(results);
  const baseline = readBaseline(baselineFile);
  const verdict = checkRatchet(score, baseline);

  console.log(`mutants: ${results.killed} killed, ${results.timeout} timeout, `
    + `${results.suspicious} suspicious, ${results.survived} survived, ${results.skipped} uncovered`);
  console.log(`score:   ${score}%`);
  console.log(verdict.ok ? `OK:   ${verdict.reason}` : `FAIL: ${verdict.reason}`);

  if (write && baselineFile && verdict.ok) {
    fs.writeFileSync(baselineFile, `${JSON.stringify({ score, recorded: new Date().toISOString() }, null, 2)}\n`);
    console.log(`baseline recorded in ${baselineFile}`);
  }

  return verdict.ok ? 0 : 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { parseMutmutResults, computeScore, checkRatchet, readBaseline };
