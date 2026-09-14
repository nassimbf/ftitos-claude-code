#!/usr/bin/env node
/**
 * PreToolUse Hook: block reads of secret files (Read | Grep | Bash).
 *
 * Ported from open-gsd/gsd-core's gsd-secret-read-guard.js, reduced to the part
 * that travels. `pre-secrets-block.js` already stops secrets being written; this
 * is the other direction, which was open. Three tools can put file contents into
 * the conversation, and once a secret is in the transcript it is in every later
 * request — including every subagent prompt built from that context.
 *
 * Why a hook rather than a `Read(.env)` deny rule in settings.json, which is the
 * obvious alternative: a Read() deny rule arms a Claude Code check that prompts
 * on ANY `cd DIR && cat relative-path` compound, even under `auto`. A PreToolUse
 * denial never arms it, and it still applies under `bypassPermissions`.
 *
 * Matching is on the BASENAME, case-insensitively. `.ENV` is the secret file on
 * a case-insensitive filesystem, and substring matching would wrongly catch
 * `environment.md`.
 *
 * Known, inherited limitation (GSD #4580): the template exemption tests the
 * FINAL extension, so `.env.<anything>.example` is trusted. A real secret named
 * `.env.prod.example` is not protected. That is the deliberate price of not
 * refusing legitimate committed templates like `.env.local.example`.
 */

'use strict';

const path = require('path');
const { readStdinJson, output, log } = require('./lib/utils');
const { HOOK_ON_CRASH, crash } = require('./lib/hook-exit.js');

// Tools that can put file contents into the conversation.
const GUARDED_TOOLS = new Set(['Read', 'Grep', 'Bash']);

// Final extensions that mark a committed, secret-free template.
const TEMPLATE_EXTS = new Set(['example', 'sample', 'template', 'dist']);

function isSecretName(rawToken) {
  if (!rawToken) return false;
  // `git show HEAD:.env` and `C:\proj\.env` both yield the secret after the last
  // colon. Testing that tail avoids needing to parse git or Windows paths.
  const afterColon = rawToken.includes(':') ? rawToken.slice(rawToken.lastIndexOf(':') + 1) : rawToken;
  const base = path.basename(afterColon.trim().replace(/^["']|["']$/g, '')).toLowerCase();

  if (base === '.secrets') return true;
  if (base === '.env') return true;
  if (!base.startsWith('.env.')) return false;

  const finalExt = base.slice(base.lastIndexOf('.') + 1);
  return !TEMPLATE_EXTS.has(finalExt);
}

// A `git commit` message that NAMES a secret file is not a read of it — the same
// distinction cc-safety-net draws for destructive commands. This guard blocked
// its own introducing commit before this existed. Only `git commit` bodies are
// stripped: a heredoc fed to a shell (`bash <<EOF ... EOF`) is executable and
// stays in scope.
function stripCommitMessages(cmd) {
  if (!/\bgit\s+commit\b/.test(cmd)) return cmd;
  return cmd
    .replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, ' MSG ')
    .replace(/(-m|--message)(\s+)"(?:[^"\\]|\\.)*"/g, '$1$2MSG')
    .replace(/(-m|--message)(\s+)'(?:[^'\\]|\\.)*'/g, '$1$2MSG');
}

// Split a Bash command into candidate operands. Quotes, subshells and command
// substitution are stripped to whitespace so their contents become operands too:
// `echo $(cat .env)` and `bash -c "cat .env"` both surface `.env`.
function bashOperands(command) {
  return stripCommitMessages(String(command))
    // Empty quote pairs are invisible to the shell but split a word for anything
    // matching on text: `.en''v` is `.env` when it runs (probed 2026-09-14).
    // Drop the pairs before the remaining quotes become separators.
    .replace(/''|""/g, '')
    .replace(/[$<]\(|\)|`|"|'/g, ' ')
    .split(/[\s;|&{}]+/)
    .filter(Boolean);
}

function findSecret(input) {
  const tool = input.tool_name;
  const args = input.tool_input || {};

  if (tool === 'Read') {
    return isSecretName(args.file_path) ? args.file_path : null;
  }
  if (tool === 'Grep') {
    // A glob selecting the secret namespace counts the same as a path.
    for (const candidate of [args.path, args.glob]) {
      if (isSecretName(candidate)) return candidate;
    }
    return null;
  }
  if (tool === 'Bash') {
    return bashOperands(args.command).find(isSecretName) || null;
  }
  return null;
}

async function main() {
  const input = await readStdinJson();
  if (!input || !GUARDED_TOOLS.has(input.tool_name)) return output({});

  const hit = findSecret(input);
  if (!hit) return output({});

  log(`secret-read-guard: blocked ${input.tool_name} on ${hit}`);
  return output({
    decision: 'block',
    reason:
      `secret-read-guard: ${hit} is a secret file, and this ${input.tool_name} would put its ` +
      `contents into the conversation — where they stay, in every later request and every ` +
      `subagent prompt built from it. Read the value from the environment instead, or read ` +
      `the committed template (.env.example) if you only need the key names.`,
  });
}

// DENY on crash. This hook's entire job is keeping a secret out of the
// conversation, and a secret that lands there stays there — in every later
// request and every subagent prompt built from it. If findSecret throws it has
// NOT cleared the read, and silence is indistinguishable from approval.
//
// Before this, an exception exited 1: neither allow nor deny, an unhandled
// rejection with undefined blocking behaviour. A non-string file_path reaches
// it (2026-09-14).
main().catch(err => crash(HOOK_ON_CRASH.DENY, err));
