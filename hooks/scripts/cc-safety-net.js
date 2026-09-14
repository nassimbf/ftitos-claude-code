#!/usr/bin/env node
/**
 * PreToolUse Hook: Semantic destructive-command guard.
 *
 * Goes beyond regex matching: unwraps shell wrappers, detects interpreter
 * one-liners, flag-reorder bypasses, and subshell expansion patterns before
 * applying dangerous-pattern checks.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_STDIN = 1024 * 1024;
const LOG_PATH = path.join(os.homedir(), '.claude', 'safety-net.log');

// Wrappers whose inner argument should be recursively analyzed.
// Interpreters take both -c (python) and -e (node/perl/ruby); matching only -e
// left `python3 -c "import os; os.system('rm -rf /')"` unguarded.
const SHELL_WRAPPERS = /^(sh|bash|zsh|dash|eval)\s+(-[a-z]*c\s+|(?=-c\b))/i;
const INTERP_WRAPPERS = /^(python3?|node|perl|ruby)\s+(-[a-z]*[ce]\s+|(?=-[ce]\b))/i;

// A commit message that *describes* a dangerous command is not that command.
// Strip message bodies from `git commit` invocations before pattern matching,
// leaving anything chained after the commit intact.
function stripCommitMessages(cmd) {
  if (!/\bgit\s+commit\b/.test(cmd)) return cmd;
  return cmd
    .replace(/\$\(\s*cat\s*<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\s*\)/g, 'MSG')
    .replace(/(-m|--message)(\s+)"(?:[^"\\]|\\.)*"/g, '$1$2MSG')
    .replace(/(-m|--message)(\s+)'(?:[^'\\]|\\.)*'/g, '$1$2MSG');
}

function stripOuterQuotes(str) {
  let s = str.trim();
  let prev;
  do {
    prev = s;
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
  } while (s !== prev);
  return s;
}

// Unwrap one level of sh -c / bash -c / eval / python -e / node -e etc.
function unwrap(cmd) {
  const trimmed = cmd.trim();
  const shellMatch = trimmed.match(/^(?:sh|bash|zsh|dash)\s+-[a-z]*c\s+([\s\S]+)/i);
  if (shellMatch) return stripOuterQuotes(shellMatch[1].trim());
  const evalMatch = trimmed.match(/^eval\s+([\s\S]+)/i);
  if (evalMatch) return stripOuterQuotes(evalMatch[1].trim());
  const interpMatch = trimmed.match(/^(?:python3?|node|perl|ruby)\s+-[a-z]*[ce]\s+([\s\S]+)/i);
  if (interpMatch) return stripOuterQuotes(interpMatch[1].trim());
  return null;
}

// A base64 literal that the command itself decodes is not opaque to us — we can
// decode it too. `echo cm0gLXJmIC8= | base64 -d | sh` carries no dangerous text
// until you decode it, at which point it is plainly `rm -rf /`. Adding the
// decoded string as another layer means every existing pattern applies to it,
// rather than needing a bespoke rule per payload.
//
// Only runs when the command actually decodes something, so ordinary base64
// *encoding* and unrelated long tokens are never touched. Non-printable results
// are dropped: that is a binary blob, not a command.
const BASE64_DECODE = /\bbase64\b[^|;&\n]*(?:-{1,2}d\b|--decode\b)/i;

function decodedPayloads(cmd) {
  if (!BASE64_DECODE.test(cmd)) return [];
  const out = [];
  for (const m of cmd.matchAll(/[A-Za-z0-9+/]{8,}={0,2}/g)) {
    const token = m[0];
    if (token.length % 4 !== 0) continue;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      if (decoded && /^[\x20-\x7e\s]+$/.test(decoded)) out.push(decoded);
    } catch { /* not base64 — ignore */ }
  }
  return out;
}

// Recursively unwrap up to 5 levels; return array of all command strings seen
function allLayers(cmd, depth = 0) {
  const layers = [cmd];
  if (depth >= 5) return layers;
  const inner = unwrap(cmd);
  if (inner && inner !== cmd) layers.push(...allLayers(inner, depth + 1));
  return layers;
}

// Normalize short flags so flag-reorder bypasses are caught:
// "rm -r -f /foo" → "rm -fr /foo" by merging and sorting flag chars.
// Long options (--force, --hard) are intentionally left unchanged so their
// dedicated patterns continue to match them literally.
function normalizeFlags(cmd) {
  return cmd.replace(/(?:\s+-[a-zA-Z]+)+/g, match => {
    const chars = [...match.matchAll(/-([a-zA-Z]+)/g)].flatMap(m => m[1].split(''));
    return chars.length ? ' -' + [...new Set(chars)].sort().join('') : match;
  });
}

// `\brm\b` matched `rm` anywhere in the string, so a command that merely *carried*
// the text — `grep -r "rm -rf ~" ./docs` — was blocked (observed 2026-09-14).
// `echo` and commit messages had bespoke exemptions; every other consumer did not.
// Matching command position instead of any position fixes the whole class: a word
// is a command when it opens the string or follows a separator, optionally behind
// a runner that execs its argument (`sudo rm`, `xargs rm`). Anything else is data.
// `{` opens a brace group, which is a command position exactly like `;` or `|`.
// Omitting it meant `{ rm -rf /; }` ran a command the guard never inspected
// (probed 2026-09-14, alongside the quote-splitting case handled in normalize()).
const CMD_POS = String.raw`(?:^|[;&|(\n{])\s*(?:(?:sudo|doas|xargs|time|nohup|env|command)\s+(?:-\S+\s+)*)*`;

// Flags and target must be read from the SAME command, so stop at a separator.
// With `[\s\S]*` the lookaheads searched the whole string and borrowed evidence
// from later segments: `rm -rf build && ls skills/` was judged against the `/`
// in `skills/` and blocked. SEG is everything up to the next `;`, `&`, `|`, newline.
const SEG = String.raw`[^;&|\n]*`;

const PATTERNS = [
  // A bare `/` target ends at whitespace, end-of-string, OR a shell separator.
  // Accepting only the first two meant `{ rm -rf /; }` read as a path `/;` and
  // fell through — the brace-group bypass was two bugs, not one.
  { re: new RegExp(CMD_POS + String.raw`rm\b(?=${SEG}-[a-z]*f)(?=${SEG}-[a-z]*r)(?=${SEG}(?:\/(?:\s|$|[;&|)}])|~|\$(?:HOME|\{HOME\})|\.\.\/.*\.\.\/))`), label: 'rm -rf targeting root, home, or .. chain' },
  // These five carried the original `\b`-anywhere matching after `rm` was moved
  // to command position (a47f4d8, e544109). The fix was applied to one rule, not
  // to the class, so `echo "git push --force is banned"` and
  // `grep -r "git reset --hard" ./docs` were both blocked — writing about a
  // command is not running it, the same regression already fixed for `rm`.
  { re: new RegExp(CMD_POS + String.raw`git\s+push\b${SEG}(?:--force|--force-with-lease|-f)\b`), label: 'git push --force' },
  { re: new RegExp(CMD_POS + String.raw`git\s+reset\s+--hard\b`), label: 'git reset --hard' },
  { re: new RegExp(CMD_POS + String.raw`chmod\s+(?:-R\s+)?(?:777|a\+rwx)\b`), label: 'chmod 777 / chmod -R 777' },
  { re: new RegExp(CMD_POS + String.raw`git\s+clean\b(?=${SEG}-[a-z]*f)`), label: 'git clean -f / -fd / -fdx' },
  // SQL is the exception and must NOT be anchored to command position: it lives
  // in argument position by nature — `psql -c "DROP TABLE users"` is how you run
  // it. So it stays matchable anywhere, and the exemption moves to the CONSUMER
  // instead (see isTextConsumer): searching a migration for DROP TABLE is
  // reading, piping it into a database client is not.
  { re: /\bDROP\s+(?:DATABASE|TABLE)\b/i, label: 'DROP DATABASE or DROP TABLE', textSafe: true },
  // Stash stack is shared across all worktrees: a bare pop can apply ANOTHER
  // session's WIP into this tree (observed failure 2026-06-10, phase1-tools).
  // Require an explicit ref: git stash apply stash@{n} (apply keeps the entry).
  { re: new RegExp(CMD_POS + String.raw`git\s+stash\s+pop\b(?![\s\S]*stash@\{\d+\})`), label: 'bare git stash pop (shared stash stack across worktrees — use git stash apply stash@{n} with explicit ref instead)' },
  { re: /(?:curl|wget)\s+[^|]+\|\s*(?:bash|sh|zsh|dash)\b/, label: 'remote code execution via pipe to shell' },
  // Decoding a payload straight into an interpreter. decodedPayloads() already
  // scans the *content*; this catches the mechanism itself, which still holds
  // when the payload is unparseable (read from a file, split across variables).
  // Decoding to a file or to stdout is untouched — the sink is what matters.
  { re: /\bbase64\b[^|;&\n]*(?:-{1,2}d\b|--decode\b)[^|]*\|\s*(?:bash|sh|zsh|dash|python3?|node|perl|ruby)\b/i, label: 'base64-decoded payload piped to an interpreter' },
  { re: /\beval\b[\s\S]*\bbase64\b[^|;&\n]*(?:-{1,2}d\b|--decode\b)/i, label: 'eval of a base64-decoded payload' },
  { re: /:\(\)\s*\{[^}]*:\s*\|[^}]*:&[^}]*\};?\s*:/, label: 'fork bomb' },
  // Interpreter one-liners with dangerous content. Matches -c as well as -e:
  // python's flag is -c, so an -e-only pattern missed the most common form
  // (observed 2026-08-12 while testing the hook against `python3 -c`).
  { re: /(?:python3?|node|perl|ruby)\s+-[a-z]*[ce]\s+.*(?:os\.system|subprocess|exec|eval|unlink|rmdir|rm)/i, label: 'dangerous interpreter one-liner' },
  // subshell expansion feeding rm -rf
  { re: new RegExp(CMD_POS + String.raw`rm\s+${SEG}-[a-z]*r[a-z]*f[a-z]*\s+${SEG}(?:\$\(|` + '`)'), label: 'rm -rf with subshell expansion' },
];

// An empty quote pair is invisible to the shell but splits a word for anything
// matching on text: `r''m` executes `rm`. Dropping the pairs restores the word
// the shell will actually run. Done after commit-message stripping, which needs
// real quotes intact to find message bodies.
function collapseEmptyQuotes(cmd) {
  return cmd.replace(/''|""/g, '');
}

// `$IFS` expands to whitespace, so `${IFS}rm${IFS}-rf${IFS}/` runs `rm -rf /`
// while matching no pattern that expects literal spaces. Worse, a *leading*
// `${IFS}` displaces the command from the start of the string, so CMD_POS —
// which anchors on `^` or a separator — stops matching at all and every guard
// below it falls through (probed 2026-09-14). Substituting a real space is what
// the shell does, and it restores both the word boundaries and the anchor.
function expandIfs(cmd) {
  return cmd.replace(/\$\{IFS\}|\$IFS\b/g, ' ');
}

// `X=rm; $X -rf /` never writes the dangerous word in command position, so the
// text carries no evidence. Resolve single-word assignments and substitute them
// forward, which is the only case worth handling: a value with spaces or command
// substitution is not something we can evaluate without running it, and a guard
// that guesses there would produce false positives. Bounded to 5 rounds so
// chained assignments (`A=rm; B=$A; $B -rf /`) resolve without looping forever.
function resolveAssignments(cmd) {
  let out = cmd;
  for (let round = 0; round < 5; round += 1) {
    const before = out;
    const vars = new Map();
    for (const m of out.matchAll(/(?:^|[;&|(\n{])\s*([A-Za-z_]\w*)=(['"]?)([\w./-]+)\2(?=\s|;|&|\||$)/g)) {
      vars.set(m[1], m[3]);
    }
    if (!vars.size) break;
    out = out.replace(/\$\{(\w+)\}|\$(\w+)\b/g, (match, braced, bare) => {
      const name = braced || bare;
      return vars.has(name) ? vars.get(name) : match;
    });
    if (out === before) break;
  }
  return out;
}

// Tools that only read or print text. When one of these is what runs, a
// dangerous-looking string among its arguments is the thing being searched for,
// not a thing being executed — `rg "DROP TABLE users" --glob "*.sql"` is how you
// audit a schema. Command-position anchoring cannot express this, because SQL
// legitimately sits in argument position either way; the difference is entirely
// in who consumes it. Deliberately excludes anything that can execute a match
// (find -exec, xargs, awk system()).
const TEXT_CONSUMERS = /^(?:grep|egrep|fgrep|rg|ag|ack|echo|printf|cat|bat|less|more|head|tail|wc|sort|uniq|diff|comm)\b/;

function isTextConsumer(cmd) {
  return String(cmd || '').trim().split(/[;&|\n]/).every(segment => {
    const seg = segment.trim();
    return seg === '' || TEXT_CONSUMERS.test(seg);
  });
}

function check(cmd) {
  const cleaned = collapseEmptyQuotes(stripCommitMessages(cmd));
  const textOnly = isTextConsumer(cleaned);
  // Order matters. IFS expansion restores the word boundaries and the leading
  // command position, so assignment resolution can see `X=rm` at all; both must
  // precede pattern matching. Decoded payloads are analysed as commands in their
  // own right, through the same wrapper-unwrapping as anything else.
  const resolved = resolveAssignments(expandIfs(cleaned));
  const layers = [
    ...allLayers(resolved),
    ...decodedPayloads(cleaned).flatMap(payload => allLayers(payload)),
  ];
  for (const layer of layers) {
    const normalized = normalizeFlags(layer);
    for (const { re, label, textSafe } of PATTERNS) {
      // textSafe rules match in argument position by design, so they are the
      // only ones a read-only consumer can exempt. Every other rule is already
      // anchored to command position and needs no exemption.
      if (textSafe && textOnly) continue;
      if (re.test(normalized)) return label;
    }
  }
  return null;
}

function block(reason, cmd) {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CLAUDE_API_SESSION_ID || 'unknown';
  const entry = `${new Date().toISOString()} session=${sessionId} reason="${reason}" cmd=${JSON.stringify(cmd)}\n`;
  try { fs.appendFileSync(LOG_PATH, entry); } catch { /* log failure is non-fatal */ }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `SAFETY-NET BLOCKED: ${reason}. Original command: ${cmd}. If this is intentional, confirm with the user first.`,
    },
  }));
  process.exit(2);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) raw += chunk.substring(0, MAX_STDIN - raw.length);
});
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const cmd = String(input.tool_input?.command || '');
    const reason = check(cmd);
    if (reason) block(reason, cmd);
  } catch { /* parse error — pass through */ }
  process.stdout.write(raw);
});
