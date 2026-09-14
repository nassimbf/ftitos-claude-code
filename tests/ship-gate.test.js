#!/usr/bin/env node
/**
 * Tests for hooks/scripts/ship-gate.js
 *
 * The pre-commit gate runs tests and doctor on THIS repo. Nothing checked what
 * leaves it. rules/security.md requires a dependency audit before ship and
 * rules/code.md bans debug artifacts and TODO-without-issue-reference, but both
 * were prose — advice the model can skip. This hook is the enforcement.
 *
 * Scope is deliberately narrow: things that are fast to detect, unambiguous, and
 * genuinely embarrassing in front of a client. Slow checks (full suite, coverage)
 * belong in the pre-commit gate and CI, not in the push path — a gate that takes
 * minutes is a gate people route around, and block-no-verify exists precisely
 * because they will.
 *
 * Note on fixtures: secret-shaped strings are assembled at runtime rather than
 * written literally. pre-secrets-block.js refuses to write this file otherwise —
 * it caught the first draft, which is the hook doing its job.
 */

'use strict';

const assert = require('assert');
const {
  isShipCommand,
  scanDiff,
  manifestsInDiff,
  parseNpmAudit,
  parsePipAudit,
  rulesForFile,
} = require('../hooks/scripts/ship-gate.js');

// A unified diff for one file. The scanner has to know which file a line belongs
// to, because the rules that apply depend on it.
function diffFor(file, ...addedLines) {
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    '@@ -0,0 +1 @@',
    ...addedLines.map(l => `+${l}`),
  ].join('\n');
}

// A diff line is only interesting when it is ADDED (+). Removing a console.log
// must never be blocked — that is the fix, not the offence.
function added(...lines) {
  return lines.map(l => `+${l}`).join('\n');
}

const FAKE_AWS_KEY = 'AKIA' + 'IOSFODNN7EXAMPLE';
const PRIVATE_KEY_HEADER = '-----BEGIN RSA PRIVATE ' + 'KEY-----';

const cases = [
  ['recognises the commands that ship code', () => {
    assert(isShipCommand('git push'), 'bare push ships');
    assert(isShipCommand('git push origin main'));
    assert(isShipCommand('git push --force-with-lease origin feat/x'));
    assert(isShipCommand('gh pr create --fill'));
    assert(isShipCommand('cd /repo && git push'), 'push after a chain still ships');
  }],

  ['ignores commands that do not ship', () => {
    assert(!isShipCommand('git status'));
    assert(!isShipCommand('git commit -m "wip"'));
    assert(!isShipCommand('git fetch origin'));
    assert(!isShipCommand('git pull --rebase'));
    // Describing a push is not pushing. Same class of bug the safety net had.
    assert(!isShipCommand('echo "run git push when ready"'));
    assert(!isShipCommand('git commit -m "docs: explain git push --force"'));
  }],

  ['catches secrets in added lines', () => {
    const findings = scanDiff(added(`AWS_KEY = "${FAKE_AWS_KEY}"`));
    assert(findings.some(f => f.kind === 'secret'), 'AWS access key id must be caught');
  }],

  ['catches a private key block', () => {
    const findings = scanDiff(added(PRIVATE_KEY_HEADER));
    assert(findings.some(f => f.kind === 'secret'));
  }],

  ['catches debug artifacts', () => {
    assert(scanDiff(added('  console.log("here")')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('    import pdb; pdb.set_trace()')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('  debugger;')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('  it.only("x", () => {})')).some(f => f.kind === 'debug'));
    assert(scanDiff(added('  describe.only("y", () => {})')).some(f => f.kind === 'debug'));
  }],

  // rules/code.md: "TODO without an issue reference" is a banned pattern. With a
  // reference it is tracked work, which is fine.
  ['catches TODO without an issue reference, allows it with one', () => {
    assert(scanDiff(added('// TODO: fix this later')).some(f => f.kind === 'todo'));
    assert(!scanDiff(added('// TODO(#412): drop the shim once v2 lands')).some(f => f.kind === 'todo'));
    assert(!scanDiff(added('// TODO: see JIRA-88 for the migration')).some(f => f.kind === 'todo'));
  }],

  // The single most important negative case. A diff that REMOVES a console.log
  // is the diff that fixes the problem; blocking it inverts the gate.
  ['never blocks on removed lines', () => {
    const removalDiff = ['-  console.log("here")', `-AWS_KEY = "${FAKE_AWS_KEY}"`].join('\n');
    assert.deepStrictEqual(scanDiff(removalDiff), []);
  }],

  ['ignores context lines', () => {
    const contextDiff = ['   console.log("pre-existing")', ' debugger;'].join('\n');
    assert.deepStrictEqual(scanDiff(contextDiff), []);
  }],

  // Without this the gate cannot describe its own tests, its own rules files, or
  // this very test file — and a gate that blocks its own documentation gets
  // disabled within a day.
  ['does not flag its own documentation of the patterns', () => {
    assert.deepStrictEqual(scanDiff(added('the hook blocks console.log in a diff')), []);
    assert.deepStrictEqual(scanDiff(added('| `debugger;` | blocked |')), []);
  }],

  ['reports every distinct finding, not just the first', () => {
    const findings = scanDiff(added('console.log(1)', 'debugger;', '// TODO: later'));
    assert(findings.length >= 3, `expected 3+ findings, got ${findings.length}`);
  }],

  ['findings carry a line number and the matched rule', () => {
    const [finding] = scanDiff(added('console.log("x")'));
    assert.strictEqual(typeof finding.line, 'number');
    assert(finding.rule, 'finding must name the rule that fired');
  }],

  // --- dependency audit -------------------------------------------------
  //
  // rules/security.md: "no known critical CVEs in direct dependencies
  // (npm audit / pip-audit before ship)". That was prose. The audit itself is
  // slow — seconds for npm, longer for pip — so it runs ONLY when the outgoing
  // diff actually touches a manifest. Most pushes do not, which keeps the
  // common path fast; a gate that always costs seconds is a gate people route
  // around, same reasoning as leaving the test suite out.

  ['detects which ecosystems need auditing from the diff', () => {
    const npmDiff = 'diff --git a/package.json b/package.json\n+++ b/package.json';
    assert.deepStrictEqual(manifestsInDiff(npmDiff), ['npm']);

    const pyDiff = 'diff --git a/requirements.txt b/requirements.txt\n+++ b/requirements.txt';
    assert.deepStrictEqual(manifestsInDiff(pyDiff), ['pip']);

    const lockDiff = 'diff --git a/package-lock.json b/package-lock.json';
    assert.deepStrictEqual(manifestsInDiff(lockDiff), ['npm']);

    for (const f of ['pyproject.toml', 'uv.lock', 'Pipfile']) {
      assert.deepStrictEqual(manifestsInDiff(`diff --git a/${f} b/${f}`), ['pip'], f);
    }
  }],

  ['a diff with no manifest changes triggers no audit', () => {
    const diff = 'diff --git a/src/app.ts b/src/app.ts\n+const x = 1;';
    assert.deepStrictEqual(manifestsInDiff(diff), []);
  }],

  ['reports both ecosystems when both manifests move', () => {
    const diff = [
      'diff --git a/package.json b/package.json',
      'diff --git a/pyproject.toml b/pyproject.toml',
    ].join('\n');
    assert.deepStrictEqual(manifestsInDiff(diff).sort(), ['npm', 'pip']);
  }],

  ['parses npm audit and reports only critical and high', () => {
    const report = JSON.stringify({
      vulnerabilities: {
        'bad-pkg': { name: 'bad-pkg', severity: 'critical' },
        'meh-pkg': { name: 'meh-pkg', severity: 'high' },
        'fine-pkg': { name: 'fine-pkg', severity: 'moderate' },
        'whatever': { name: 'whatever', severity: 'low' },
      },
    });
    const findings = parseNpmAudit(report);
    const names = findings.map(f => f.package).sort();
    assert.deepStrictEqual(names, ['bad-pkg', 'meh-pkg']);
    // Moderate and low are real but not ship-blocking; blocking on them would
    // make the gate fire constantly and get switched off.
    assert(!names.includes('fine-pkg'));
  }],

  ['npm audit with no vulnerabilities yields nothing', () => {
    assert.deepStrictEqual(parseNpmAudit(JSON.stringify({ vulnerabilities: {} })), []);
  }],

  // npm audit exits non-zero when it finds something AND when it errors. A
  // parser that throws on unparseable output would turn a broken audit into a
  // blocked push, so it must degrade to "no findings" instead.
  ['unparseable audit output is not a finding', () => {
    assert.deepStrictEqual(parseNpmAudit('not json'), []);
    assert.deepStrictEqual(parseNpmAudit(''), []);
    assert.deepStrictEqual(parseNpmAudit(JSON.stringify({ error: { code: 'ENOLOCK' } })), []);
    assert.deepStrictEqual(parsePipAudit('not json'), []);
    assert.deepStrictEqual(parsePipAudit(''), []);
  }],

  ['parses pip-audit findings', () => {
    const report = JSON.stringify({
      dependencies: [
        { name: 'requests', version: '2.0.0', vulns: [{ id: 'GHSA-xxxx', fix_versions: ['2.31.0'] }] },
        { name: 'safe-lib', version: '1.0.0', vulns: [] },
      ],
    });
    const findings = parsePipAudit(report);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].package, 'requests');
    assert(findings[0].id.includes('GHSA'), 'finding must carry the advisory id');
  }],

  // --- which rules apply to which file ----------------------------------
  //
  // Found by running the gate against its own 41-commit branch: 222 findings,
  // essentially all false positives. Documentation shows example code, and a
  // test suite for a secret scanner must contain secret-shaped strings — that
  // is the test. A gate that fires 222 times on a legitimate push is a gate
  // switched off the same day, which is the exact failure this hook's own
  // header warns about.

  ['source files get every rule', () => {
    const rules = rulesForFile('src/app.ts');
    assert(rules.includes('secret') && rules.includes('debug') && rules.includes('todo'));
  }],

  ['markdown keeps secret checks but drops debug and todo', () => {
    const rules = rulesForFile('docs/guide.md');
    assert(rules.includes('secret'), 'a real key pasted into docs is still a leak');
    assert(!rules.includes('debug'), 'docs legitimately show console.log in examples');
    assert(!rules.includes('todo'), 'docs legitimately discuss TODO markers');
  }],

  // A detector's test suite has to contain the thing it detects. This repo's
  // own tests/secrets-block.test.js carries AWS's documented example key.
  ['test files are exempt, because a detector test must contain the pattern', () => {
    assert.deepStrictEqual(rulesForFile('tests/secrets-block.test.js'), []);
    assert.deepStrictEqual(rulesForFile('src/__tests__/thing.spec.ts'), []);
    assert.deepStrictEqual(rulesForFile('app/tests/test_scanner.py'), []);
  }],

  ['a file that merely has "test" in its name is not exempt', () => {
    assert(rulesForFile('src/latest-config.ts').includes('debug'),
      'latest-config is not a test file');
    assert(rulesForFile('src/contest.js').includes('debug'));
  }],

  ['debug artifacts in documentation do not fire', () => {
    const findings = scanDiff(diffFor('agents/debugger.md',
      "console.log('[1] Starting validation');",
      'return <div>{/* TODO */}</div>'));
    assert.deepStrictEqual(findings, [], 'example code in docs is not a defect');
  }],

  ['a real key in documentation still fires', () => {
    const findings = scanDiff(diffFor('README.md', `key = "${FAKE_AWS_KEY}"`));
    assert(findings.some(f => f.kind === 'secret'), 'a leaked key is a leak wherever it sits');
  }],

  ['debug artifacts in source still fire', () => {
    const findings = scanDiff(diffFor('src/handler.ts', '  console.log("here");'));
    assert(findings.some(f => f.kind === 'debug'));
  }],

  ['findings name the file they came from', () => {
    const [finding] = scanDiff(diffFor('src/handler.ts', '  debugger;'));
    assert.strictEqual(finding.file, 'src/handler.ts');
  }],

  ['a multi-file diff attributes each finding correctly', () => {
    const combined = [
      diffFor('docs/a.md', "console.log('example');"),
      diffFor('src/b.ts', "console.log('real');"),
    ].join('\n');
    const findings = scanDiff(combined);
    assert.strictEqual(findings.length, 1, 'only the source file should fire');
    assert.strictEqual(findings[0].file, 'src/b.ts');
  }],

  // The third category, found on the same run. In a CLI, stdout IS the
  // interface: `scripts/ci/mutation-ratchet.js` printing its score is the entire
  // point of the program. Calling that a debug artifact left 97 false positives
  // after the doc and test exemptions had already cleared 120.
  //
  // Only console.log is context-dependent this way. A `debugger;` statement or a
  // `pdb.set_trace()` is a defect in a CLI exactly as much as in a library, so
  // the exemption is per-RULE, not per-kind.
  ['console.log in a CLI is output, not a debug artifact', () => {
    for (const file of ['scripts/ci/doctor.js', 'bin/tool.js', 'tools/gen.js']) {
      const findings = scanDiff(diffFor(file, "  console.log('score: 91%');"));
      assert.deepStrictEqual(
        findings, [],
        `${file}: printing is what a CLI does`
      );
    }
  }],

  ['a real debugger statement still fires in a CLI', () => {
    const findings = scanDiff(diffFor('scripts/ci/doctor.js', '  debugger;'));
    assert(findings.some(f => f.rule === 'js-debugger'),
      'debugger is a defect wherever it appears');
  }],

  ['a focused test still fires in a CLI path', () => {
    const findings = scanDiff(diffFor('scripts/run.js', '  it.only("x", () => {});'));
    assert(findings.some(f => f.rule === 'focused-test'));
  }],

  ['console.log in application code still fires', () => {
    const findings = scanDiff(diffFor('apps/api/handler.ts', "  console.log(user);"));
    assert(findings.some(f => f.rule === 'console-log'),
      'application code is not a CLI — stdout is not its interface');
  }],

  // Fourth category from the same run: vendored third-party code. Most of the
  // remaining 77 came from skills/browse/, which is gstack's code at a pin. You
  // cannot fix upstream's console.log in your own push, so flagging it is pure
  // noise — and noise is what gets a gate switched off.
  //
  // Declared rather than guessed: a path like `skills/browse` carries no marker
  // saying it is vendored, so the project states it in .shipgateignore.
  ['vendored paths listed in .shipgateignore are exempt', () => {
    const ignore = ['# vendored from gstack', 'skills/browse/', '', 'skills/cso/'];
    const findings = scanDiff(
      diffFor('skills/browse/src/manager.ts', "console.log('[browse] loaded');"),
      ignore
    );
    assert.deepStrictEqual(findings, [], 'upstream code is not ours to gate');
  }],

  ['an unlisted path is still checked', () => {
    const ignore = ['skills/browse/'];
    const findings = scanDiff(
      diffFor('skills/mine/src/thing.ts', "console.log('mine');"),
      ignore
    );
    assert(findings.some(f => f.rule === 'console-log'));
  }],

  ['a secret in vendored code still fires', () => {
    const findings = scanDiff(
      diffFor('skills/browse/config.ts', `const k = "${FAKE_AWS_KEY}";`),
      ['skills/browse/']
    );
    assert(findings.some(f => f.kind === 'secret'),
      'a live key is a leak even in vendored code — you are still publishing it');
  }],

  // "TODO-without-issue-reference" in a comment is prose about TODOs, not a
  // TODO. The marker has to stand as a word.
  ['a hyphenated compound is not a TODO marker', () => {
    assert.deepStrictEqual(
      scanDiff(diffFor('src/a.ts', '// bans TODO-without-issue-reference markers')),
      []
    );
    assert.deepStrictEqual(
      scanDiff(diffFor('src/a.ts', '// see the FIXME-style convention')),
      []
    );
  }],

  ['a real TODO marker still fires after that tightening', () => {
    assert(scanDiff(diffFor('src/a.ts', '// TODO: handle retries'))
      .some(f => f.kind === 'todo'));
    assert(scanDiff(diffFor('src/a.ts', '  # TODO fix this'))
      .some(f => f.kind === 'todo'));
    assert(scanDiff(diffFor('src/a.ts', '{/* TODO */}'))
      .some(f => f.kind === 'todo'));
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
console.log(`\nship-gate: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
