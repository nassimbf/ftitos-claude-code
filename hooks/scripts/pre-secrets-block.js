#!/usr/bin/env node
/**
 * PreToolUse Hook: secret leak guard.
 *
 * Two checks, both deterministic:
 *   1. Path  — refuse to write files that exist to hold credentials (.env, *.pem, id_rsa).
 *   2. Body  — refuse content carrying a live-looking credential (sk-, ghp_, AKIA, PEM block,
 *              or a password/secret/token assigned a real literal rather than an env lookup).
 *
 * Advice in a rules file never stopped a commit. This does.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { HOOK_ON_CRASH, crash } = require('./lib/hook-exit.js');

const MAX_STDIN = 1024 * 1024;
const LOG_PATH = path.join(os.homedir(), '.claude', 'safety-net.log');
const EXIT_BLOCKED = 2;
const WATCHED_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Filenames that are safe by convention: they hold references, not values.
const TEMPLATE_SUFFIX = /\.(example|template|tpl|sample|dist)$/i;

const SENSITIVE_PATHS = [
  { re: /^\.env(\..+)?$/i, label: '.env file (commit .env.example instead)' },
  { re: /\.pem$/i, label: 'PEM certificate/key file' },
  { re: /\.key$/i, label: 'private key file' },
  { re: /^id_(rsa|ed25519|ecdsa|dsa)/i, label: 'SSH private key' },
  { re: /^credentials(\..+)?$/i, label: 'credentials file' },
  { re: /^secrets?(\..+)?$/i, label: 'secrets file' },
  { re: /\.(p12|pfx|jks|keystore)$/i, label: 'keystore file' },
];

const SECRET_BODIES = [
  { re: /\bsk-[A-Za-z0-9_-]{20,}/, label: 'Anthropic/OpenAI-style API key (sk-...)' },
  { re: /\bghp_[A-Za-z0-9]{36}\b/, label: 'GitHub personal access token (ghp_...)' },
  { re: /\bgithub_pat_[A-Za-z0-9_]{80,}\b/, label: 'GitHub fine-grained PAT' },
  { re: /\bAKIA[A-Z0-9]{16}\b/, label: 'AWS access key ID (AKIA...)' },
  { re: /-----BEGIN[A-Z ]*PRIVATE KEY-----/, label: 'inline PEM private key block' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, label: 'Slack token' },
];

// A literal that is obviously a stand-in rather than a real credential.
const PLACEHOLDER = /^(your|my|the|example|sample|changeme|change_me|placeholder|redacted|dummy|fake|test|xxx+|\.{3}|<|\$\{|%s|\{\{)/i;

const ASSIGNED_SECRET = /\b(password|passwd|pwd|secret|token|api_?secret|client_?secret|credential)s?\s*[:=]\s*(['"])([^'"\n]{12,})\2/i;

function isPlaceholder(value) {
  return PLACEHOLDER.test(value.trim()) || /\b(here|goes[-_ ]?here|your[-_ ])/i.test(value);
}

function checkPath(filePath) {
  if (!filePath) return null;
  const base = path.basename(filePath);
  if (TEMPLATE_SUFFIX.test(base)) return null;
  const hit = SENSITIVE_PATHS.find(({ re }) => re.test(base));
  return hit ? `write to ${hit.label}` : null;
}

function checkBody(body) {
  if (!body) return null;
  const hit = SECRET_BODIES.find(({ re }) => re.test(body));
  if (hit) return `content contains a ${hit.label}`;
  const assigned = body.match(ASSIGNED_SECRET);
  if (assigned && !isPlaceholder(assigned[3])) {
    return `content assigns a literal value to "${assigned[1]}" (read it from the environment instead)`;
  }
  return null;
}

// Write sends `content`; Edit sends `new_string`; NotebookEdit sends `new_source`.
function bodyOf(toolInput) {
  return [toolInput.content, toolInput.new_string, toolInput.new_source]
    .filter(part => typeof part === 'string')
    .join('\n');
}

function block(reason, filePath) {
  const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
  const entry = `${new Date().toISOString()} session=${sessionId} hook=secrets-block reason=${JSON.stringify(reason)} file=${JSON.stringify(filePath || '')}\n`;
  try { fs.appendFileSync(LOG_PATH, entry); } catch { /* log failure is non-fatal */ }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext:
        `SECRETS-BLOCK: refused — ${reason}. File: ${filePath || '(unknown)'}. ` +
        'Store the value in a secret manager or shell env and reference it by name. ' +
        'If this is a template, name it *.example or *.template.',
    },
  }));
  process.exit(EXIT_BLOCKED);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) raw += chunk.substring(0, MAX_STDIN - raw.length);
});
process.stdin.on('end', () => {
  // Two failures live here and they need OPPOSITE policies. One catch used to
  // cover both, so a throw anywhere in the scan fell through to the pass-through
  // below and shipped the secret (found 2026-09-14).
  //
  //   parse failure  -> ALLOW. Input we could not read is not evidence of a
  //                     secret, and blocking every malformed payload would wedge
  //                     the tool on an unrelated bug.
  //   scan failure   -> DENY.  This hook's entire job is stopping a secret. If
  //                     its own scan crashes it has NOT cleared the write, and
  //                     saying nothing is indistinguishable from saying yes.
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw); // ALLOW: unparseable input
    return;
  }

  try {
    if (WATCHED_TOOLS.has(input.tool_name)) {
      const toolInput = input.tool_input || {};
      const filePath = toolInput.file_path || toolInput.notebook_path;
      const reason = checkPath(filePath) || checkBody(bodyOf(toolInput));
      if (reason) block(reason, filePath);
    }
  } catch (err) {
    crash(HOOK_ON_CRASH.DENY, err); // DENY: the scan did not clear this write
    return;
  }

  process.stdout.write(raw);
});
