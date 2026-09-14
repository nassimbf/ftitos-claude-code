#!/usr/bin/env node
/**
 * PreToolUse Hook: ship gate.
 *
 * The pre-commit gate protects THIS repo. Nothing protected what leaves it.
 * rules/security.md requires a dependency audit before ship; rules/code.md bans
 * debug artifacts and TODO-without-issue-reference. Both were prose, which the
 * model may skip. This makes them exit codes.
 *
 * Fires on `git push` and `gh pr create` — the moment code becomes someone
 * else's problem.
 *
 * WHAT IT DOES NOT DO, deliberately: run the test suite, or measure coverage.
 * Those take minutes, and a gate that takes minutes is a gate people route
 * around. Tests and doctor already run at pre-commit; coverage belongs in CI.
 * This checks only what is fast, unambiguous, and embarrassing in front of a
 * client.
 *
 * Crash policy: FAIL OPEN. A broken gate must never wedge every push — that
 * turns one bug into an outage. The deterministic gates behind it (pre-commit,
 * block-no-verify, CI) are what make failing open acceptable here.
 */

'use strict';

const { execFileSync } = require('child_process');

const EXIT_BLOCK = 2;
const MAX_FINDINGS_SHOWN = 20;

// A word is a command when it opens the string or follows a separator. Same
// command-position reasoning as cc-safety-net: matching `git push` anywhere in
// the text blocked commit messages that merely described a push.
const SHIP_PATTERNS = [
  /(?:^|[;&|(\n{])\s*(?:[\w./-]*\s+)*?git\s+push\b/,
  /(?:^|[;&|(\n{])\s*(?:[\w./-]*\s+)*?gh\s+pr\s+create\b/,
];

// Quoted text is data, not a command. `git commit -m "explain git push"` and
// `echo "run git push"` both carry the words without running them.
function stripQuoted(cmd) {
  return cmd
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function isShipCommand(cmd) {
  const bare = stripQuoted(String(cmd || ''));
  return SHIP_PATTERNS.some(re => re.test(bare));
}

// Each rule names itself so a block message can say which one fired and the
// author can argue with a specific rule rather than the gate as a whole.
const RULES = [
  // --- secrets -----------------------------------------------------------
  { kind: 'secret', rule: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'secret', rule: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { kind: 'secret', rule: 'openai-key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { kind: 'secret', rule: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { kind: 'secret', rule: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },

  // --- debug artifacts ---------------------------------------------------
  // Anchored to code shape (a call, a statement) rather than the bare word, so
  // prose that *mentions* console.log is not a finding. This file and its tests
  // both discuss every one of these patterns.
  // Exempt in CLI paths: there, stdout IS the interface. A script printing its
  // result is doing its job, not leaving a debug statement behind. The exemption
  // is per-RULE rather than per-kind because the other debug rules below are
  // defects everywhere — a `debugger;` in a CLI is still a `debugger;`.
  { kind: 'debug', rule: 'console-log', re: /(?:^|[\s;{(])console\.(?:log|debug|dir)\s*\(/, exemptIn: 'cli' },
  { kind: 'debug', rule: 'python-breakpoint', re: /(?:^|[\s;])(?:pdb|ipdb)\.set_trace\s*\(|(?:^|[\s;])breakpoint\s*\(\s*\)/ },
  { kind: 'debug', rule: 'js-debugger', re: /(?:^|[\s;{])debugger\s*;/ },
  { kind: 'debug', rule: 'focused-test', re: /\b(?:it|test|describe|context)\.only\s*\(/ },
  { kind: 'debug', rule: 'skipped-test', re: /\b(?:it|test|describe)\.skip\s*\(/ },

  // --- tracked work ------------------------------------------------------
  // rules/code.md bans "TODO without an issue reference". With a reference it is
  // tracked work and perfectly fine, so the rule is the *absence* of one.
  // `(?!-)` because "TODO-without-issue-reference" is prose ABOUT todo markers,
  // not a marker. The word has to stand alone to be one.
  {
    kind: 'todo',
    rule: 'todo-without-issue',
    re: /(?:^|[\s/#*])(?:TODO|FIXME|XXX|HACK)\b(?!-)(?![^\n]*(?:#\d+|[A-Z]{2,}-\d+|https?:\/\/))/,
  },
];

// Which rules apply depends on the file, and getting this wrong makes the gate
// useless in both directions.
//
// Found by running this gate against its own 41-commit branch: 222 findings,
// essentially all false positives. Documentation shows example code —
// `agents/debugger.md` demonstrates what debug logging looks like — and a test
// suite for a secret scanner must contain secret-shaped strings, because that is
// the test. `tests/secrets-block.test.js` carries AWS's own documented example
// key. A gate that fires 222 times on a legitimate push is a gate switched off
// the same day.
//
// Secrets remain checked in documentation: a real key pasted into a README is a
// leak wherever it sits. Only the debug/todo rules relax.
const TEST_PATH = /(?:^|\/)(?:tests?|__tests__|spec)\/|(?:^|\/)[^/]*\.(?:test|spec)\.[jt]sx?$|(?:^|\/)test_[^/]*\.py$/;
const DOC_PATH = /\.(?:md|mdx|markdown|rst|txt)$/i;
// Programs whose stdout is their interface. Printing there is the job.
const CLI_PATH = /(?:^|\/)(?:scripts|bin|tools|hooks)\//;

function isCliPath(file) {
  return CLI_PATH.test(String(file || ''));
}

// Vendored third-party code, declared in .shipgateignore. A path like
// `skills/browse` carries no marker saying it came from upstream, so guessing is
// not an option — the project states it. gitignore-style: one prefix per line,
// `#` comments, blanks ignored.
function isVendored(patterns) {
  const prefixes = (patterns || [])
    .map(p => String(p).trim())
    .filter(p => p && !p.startsWith('#'));
  if (!prefixes.length) return () => false;
  return file => prefixes.some(p => String(file || '').startsWith(p));
}

function readIgnoreFile(cwd) {
  try {
    return require('fs').readFileSync(require('path').join(cwd, '.shipgateignore'), 'utf8').split('\n');
  } catch {
    return [];
  }
}

/**
 * @param {string} file repo-relative path
 * @returns {string[]} the `kind`s of rule that apply
 */
function rulesForFile(file) {
  const path = String(file || '');
  // A detector's own tests must contain what it detects. Exempt entirely, and
  // accept the tradeoff: a real secret in a test file would pass here, but
  // pre-secrets-block.js already guards the write, and tests are reviewed code.
  if (TEST_PATH.test(path)) return [];
  if (DOC_PATH.test(path)) return ['secret'];
  return ['secret', 'debug', 'todo'];
}

// `diff --git a/x b/x` — take the b-side, which is the post-change path.
const FILE_HEADER = /^diff --git a\/(?:.+) b\/(.+)$/;

/**
 * Scan a unified diff. Only ADDED lines count: a diff that removes a
 * console.log is the fix, and blocking it would invert the gate.
 *
 * @param {string} diff unified diff text
 * @returns {{kind:string, rule:string, file:string, line:number, text:string}[]}
 */
function scanDiff(diff, ignorePatterns = []) {
  const findings = [];
  const lines = String(diff || '').split('\n');
  const ignored = isVendored(ignorePatterns);

  // Unknown until the first header. A bare diff with no headers — which the
  // tests for the individual rules use — gets the full rule set.
  let file = '';
  let active = ['secret', 'debug', 'todo'];

  lines.forEach((raw, index) => {
    const header = raw.match(FILE_HEADER);
    if (header) {
      file = header[1];
      // Vendored code stays checked for SECRETS — you are still publishing it —
      // but not for style: you cannot fix upstream's console.log in your push.
      active = ignored(file) ? ['secret'] : rulesForFile(file);
      return;
    }

    if (!raw.startsWith('+')) return;      // context, removal, or metadata
    if (raw.startsWith('+++')) return;     // file header, not content
    if (active.length === 0) return;       // exempt file
    const text = raw.slice(1);

    for (const { kind, rule, re, exemptIn } of RULES) {
      if (!active.includes(kind)) continue;
      if (exemptIn === 'cli' && isCliPath(file)) continue;
      if (re.test(text)) {
        findings.push({ kind, rule, file, line: index + 1, text: text.trim().slice(0, 120) });
      }
    }
  });

  return findings;
}

// --- dependency audit ----------------------------------------------------
//
// rules/security.md requires "no known critical CVEs in direct dependencies
// (npm audit / pip-audit before ship)". Auditing costs seconds, so it runs only
// when the outgoing diff actually touches a manifest. Most pushes do not, which
// keeps the common path fast — the same reasoning that leaves the test suite out.

const MANIFESTS = [
  { ecosystem: 'npm', re: /\b(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)\b/ },
  { ecosystem: 'pip', re: /\b(?:requirements(?:-[\w.]+)?\.txt|pyproject\.toml|uv\.lock|Pipfile(?:\.lock)?|poetry\.lock)\b/ },
];

// Only file headers decide this. Scanning the body would let a diff that merely
// *mentions* package.json trigger a full audit.
function manifestsInDiff(diff) {
  const headers = String(diff || '')
    .split('\n')
    .filter(l => l.startsWith('diff --git') || l.startsWith('+++') || l.startsWith('---'))
    .join('\n');
  return MANIFESTS.filter(m => m.re.test(headers)).map(m => m.ecosystem);
}

// Both parsers degrade to "no findings" on anything unreadable. These tools exit
// non-zero when they find vulnerabilities AND when they fail (no lockfile, no
// network, not installed), so a parser that threw would turn a broken audit into
// a blocked push — a gate that fails shut on its own infrastructure is one the
// user disables within a day.
function safeJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Moderate and low are real but not ship-blocking. Blocking on them would fire
// on nearly every install and train the user to bypass the gate.
const BLOCKING_SEVERITIES = new Set(['critical', 'high']);

function parseNpmAudit(raw) {
  const data = safeJson(raw);
  if (!data || !data.vulnerabilities) return [];
  return Object.values(data.vulnerabilities)
    .filter(v => v && BLOCKING_SEVERITIES.has(String(v.severity).toLowerCase()))
    .map(v => ({ ecosystem: 'npm', package: v.name, severity: v.severity, id: v.name }));
}

function parsePipAudit(raw) {
  const data = safeJson(raw);
  if (!data || !Array.isArray(data.dependencies)) return [];
  return data.dependencies.flatMap(dep =>
    (dep.vulns || []).map(v => ({
      ecosystem: 'pip',
      package: dep.name,
      severity: 'known-vulnerability',
      id: v.id || 'unknown',
      fix: (v.fix_versions || []).join(', '),
    }))
  );
}

function runTool(bin, args, cwd) {
  try {
    return execFileSync(bin, args, {
      encoding: 'utf8',
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (err) {
    // Non-zero exit is the normal path when findings exist — the report is still
    // on stdout. A missing binary yields no stdout, which parses to [].
    return (err && err.stdout) ? String(err.stdout) : '';
  }
}

function auditDependencies(ecosystems, cwd) {
  const findings = [];
  if (ecosystems.includes('npm')) {
    findings.push(...parseNpmAudit(runTool('npm', ['audit', '--json'], cwd)));
  }
  if (ecosystems.includes('pip')) {
    findings.push(...parsePipAudit(runTool('pip-audit', ['--format=json'], cwd)));
  }
  return findings;
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return '';
  }
}

// The diff that is about to leave: everything on this branch the remote does not
// have.
//
// The no-upstream case is the one that matters, and the first version got it
// wrong: it fell back to `HEAD~1...HEAD`, one commit. That is exactly backwards
// — a branch with no upstream is a branch that has never been pushed, so the
// push publishes ALL of it. On this repo's own first push that meant checking 1
// commit out of 41 (observed 2026-09-14).
//
// So: diff against the base branch instead, which is what the push actually
// adds. Only if there is no base branch at all does it fall back to the last
// commit.
function outgoingDiff() {
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).trim();
  if (upstream) return git(['diff', '--unified=0', `${upstream}...HEAD`]);

  for (const base of ['origin/HEAD', 'origin/main', 'origin/master', 'main', 'master']) {
    const resolved = git(['rev-parse', '--verify', '--quiet', base]).trim();
    if (!resolved) continue;
    // A base that is not an ancestor tells us nothing useful about this branch.
    const mergeBase = git(['merge-base', base, 'HEAD']).trim();
    if (mergeBase) return git(['diff', '--unified=0', `${mergeBase}...HEAD`]);
  }

  return git(['diff', '--unified=0', 'HEAD~1...HEAD']);
}

function formatBlock(findings, vulns) {
  const parts = [];

  if (findings.length) {
    const shown = findings.slice(0, MAX_FINDINGS_SHOWN);
    const lines = shown.map(f => `  [${f.kind}/${f.rule}] ${f.text}`);
    const more = findings.length > shown.length
      ? `\n  ...and ${findings.length - shown.length} more`
      : '';
    parts.push(`${findings.length} issue(s) in the diff about to be pushed:\n${lines.join('\n')}${more}`);
  }

  if (vulns.length) {
    const lines = vulns.slice(0, MAX_FINDINGS_SHOWN)
      .map(v => `  [${v.ecosystem}/${v.severity}] ${v.package}${v.fix ? ` — fixed in ${v.fix}` : ''} (${v.id})`);
    parts.push(
      `${vulns.length} known vulnerability(ies) in dependencies you changed:\n${lines.join('\n')}`
    );
  }

  return `SHIP-GATE BLOCKED.\n${parts.join('\n\n')}\n`
    + 'Fix these, or if one is a false positive say so and the user can decide.';
}

function main(raw) {
  const input = JSON.parse(raw);
  const cmd = String(input.tool_input?.command || '');
  if (!isShipCommand(cmd)) return null;

  const diff = outgoingDiff();
  const findings = scanDiff(diff, readIgnoreFile(process.cwd()));

  // Only pay for the audit when a manifest actually moved. Most pushes do not
  // touch one, so the common path stays as fast as the diff scan alone.
  const ecosystems = manifestsInDiff(diff);
  const vulns = ecosystems.length ? auditDependencies(ecosystems, process.cwd()) : [];

  return (findings.length || vulns.length) ? formatBlock(findings, vulns) : null;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    let reason = null;
    try {
      reason = main(raw);
    } catch {
      // Fail open. See the crash-policy note at the top: a broken gate that
      // blocks every push is worse than a gate that misses one.
      reason = null;
    }

    if (reason) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: reason },
      }));
      process.exit(EXIT_BLOCK);
    }
    process.stdout.write(raw);
  });
}

module.exports = {
  rulesForFile,
  isVendored,
  isShipCommand,
  scanDiff,
  stripQuoted,
  manifestsInDiff,
  parseNpmAudit,
  parsePipAudit,
};
