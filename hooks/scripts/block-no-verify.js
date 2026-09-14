#!/usr/bin/env node
/**
 * PreToolUse Hook: refuse to let the commit gate be skipped.
 *
 * Ported from affaan-m/ecc's scripts/hooks/block-no-verify.js.
 *
 * This repo's pre-commit gate runs the test suite and doctor, and has caught
 * five bad commits today. It is also entirely optional: `--no-verify` skips it,
 * and so does `git -c core.hooksPath=/dev/null`, which contains no such string.
 * A gate that the thing being gated may decline is a suggestion.
 *
 * Scope is git only. `npm test -- --no-verify` means something else entirely,
 * and a commit message that merely names the flag is not using it — the same
 * distinction cc-safety-net and secret-read-guard already draw.
 */

'use strict';

const { readStdinJson, output, log } = require('./lib/utils');

// Subcommands that actually honour --no-verify.
const GATED = /\bgit\b[\s\S]*\b(commit|push|merge|rebase|cherry-pick|am)\b/;

// A commit message describing the flag is not the flag. Long messages are
// normally built with command substitution, so `-m "$(printf '...')"` has to be
// stripped too — without it this hook blocked its own introducing commit, whose
// body quoted the bypass it was documenting. Substitution first: the plain
// quoted-string rule would otherwise stop at the first inner quote.
function stripMessages(cmd) {
  return cmd
    .replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, ' MSG ')
    .replace(/(-m|--message)(\s+)"\$\([\s\S]*?\)"/g, '$1$2MSG')
    .replace(/(-m|--message)(\s+)\$\([\s\S]*?\)/g, '$1$2MSG')
    .replace(/(-m|--message)(\s+)"(?:[^"\\]|\\.)*"/g, '$1$2MSG')
    .replace(/(-m|--message)(\s+)'(?:[^'\\]|\\.)*'/g, '$1$2MSG');
}

function findBypass(raw) {
  const cmd = stripMessages(String(raw));
  if (!/\bgit\b/.test(cmd)) return null;

  // hooksPath redirection: `git -c core.hooksPath=...` or `git config core.hooksPath ...`.
  // This one is the quieter bypass and is worth naming separately in the message.
  if (/\bcore\.hooksPath\b/.test(cmd)) return 'core.hooksPath';

  if (!GATED.test(cmd)) return null;
  if (/--no-verify\b/.test(cmd)) return '--no-verify';
  // -n is --no-verify for commit, but --dry-run for push. Only claim the former.
  if (/\bgit\s+commit\b/.test(cmd) && /(?:^|\s)-[a-zA-Z]*n(?:\s|$)/.test(cmd)) return '-n';

  return null;
}

async function main() {
  const input = await readStdinJson();
  if (!input || input.tool_name !== 'Bash') return output({});

  const bypass = findBypass(input.tool_input && input.tool_input.command);
  if (!bypass) return output({});

  log(`block-no-verify: blocked ${bypass}`);
  return output({
    decision: 'block',
    reason:
      `block-no-verify: this would skip the pre-commit gate via ${bypass}. The gate runs the ` +
      `test suite and doctor, and exists because a green suite is the only evidence the work ` +
      `is done. If it is failing, the failure is the finding — fix it, or say plainly that you ` +
      `are committing over a red suite and let the user decide.`,
  });
}

main();
