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

// Wrappers whose inner argument should be recursively analyzed
const SHELL_WRAPPERS = /^(sh|bash|zsh|dash|eval)\s+(-[a-z]*c\s+|(?=-c\b))/i;
const INTERP_WRAPPERS = /^(python3?|node|perl|ruby)\s+(-[a-z]*e\s+|(?=-e\b))/i;

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
  const interpMatch = trimmed.match(/^(?:python3?|node|perl|ruby)\s+-[a-z]*e\s+([\s\S]+)/i);
  if (interpMatch) return stripOuterQuotes(interpMatch[1].trim());
  return null;
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

const PATTERNS = [
  { re: /\brm\b(?=[\s\S]*-[a-z]*f)(?=[\s\S]*-[a-z]*r)(?=[\s\S]*(?:\/(?:\s|$)|~|\$(?:HOME|\{HOME\})|\.\.\/.*\.\.\/))/, label: 'rm -rf targeting root, home, or .. chain' },
  { re: /\bgit\s+push\b.*(?:--force|-f)\b/, label: 'git push --force' },
  { re: /\bgit\s+reset\s+--hard\b/, label: 'git reset --hard' },
  { re: /\bDROP\s+(?:DATABASE|TABLE)\b/i, label: 'DROP DATABASE or DROP TABLE' },
  { re: /\bchmod\s+(?:-R\s+)?(?:777|a\+rwx)\b/, label: 'chmod 777 / chmod -R 777' },
  { re: /\bgit\s+clean\b(?=[\s\S]*-[a-z]*f)/, label: 'git clean -f / -fd / -fdx' },
  { re: /(?:curl|wget)\s+[^|]+\|\s*(?:bash|sh|zsh|dash)\b/, label: 'remote code execution via pipe to shell' },
  { re: /:\(\)\s*\{[^}]*:\s*\|[^}]*:&[^}]*\};?\s*:/, label: 'fork bomb' },
  // interpreter one-liners with dangerous content
  { re: /(?:python3?|node|perl|ruby)\s+-[a-z]*e\s+.*(?:os\.system|subprocess|exec|eval|unlink|rmdir|rm)/i, label: 'dangerous interpreter one-liner' },
  // subshell expansion feeding rm -rf
  { re: /\brm\s+.*-[a-z]*r[a-z]*f[a-z]*\s+.*(?:\$\(|`)/, label: 'rm -rf with subshell expansion' },
];

function check(cmd) {
  const layers = allLayers(cmd);
  for (const layer of layers) {
    const normalized = normalizeFlags(layer);
    for (const { re, label } of PATTERNS) {
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
