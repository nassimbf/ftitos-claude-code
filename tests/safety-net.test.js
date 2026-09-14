#!/usr/bin/env node
/**
 * Tests for hooks/scripts/cc-safety-net.js
 *
 * Regression driver (observed 2026-08-12): the hook scanned the entire Bash command
 * string, so a `git commit` whose message *described* a dangerous command was blocked.
 * Writing about `git stash pop` in a changelog is not running it.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'scripts', 'cc-safety-net.js');
const EXIT_BLOCKED = 2;

function blocked(command) {
  const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  return spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' }).status === EXIT_BLOCKED;
}

const MUST_BLOCK = [
  'rm -rf ~/',
  'rm -rf /',
  'git clean -fdx',
  'git push --force origin main',
  'git stash pop',
  'git stash pop --index',
  'python3 -c "import os; os.system(\'rm -rf /\')"',
  'sh -c "rm -rf ~/"',
  // Command position, reached via a chain or a runner prefix. These must keep
  // blocking once argument-position matches stop counting (see MUST_ALLOW).
  'make build; rm -rf /',
  'sudo rm -rf /',
  'find . -type d | xargs rm -rf /',
  // Shell forms that walked straight past the command-position match (probed
  // 2026-09-14). A brace group is a command position the separator class did not
  // know about, and empty quote pairs split a word without changing what the
  // shell executes.
  '{ rm -rf /; }',
  'true\n{ rm -rf /; }',
  "r''m -rf /",
  'r""m -rf /',
  // Obfuscation that survived every guard above (probed 2026-09-14 against the
  // shipped hook). Each bypasses a different assumption:
  //
  // `${IFS}` is an own-goal. CMD_POS anchors a command to `^` or a separator, so
  // prefixing the line with a parameter expansion means the command it expands to
  // occupies neither position and the whole guard falls through. The brace-group
  // hardening that put this hook ahead of upstream is what opened it.
  '${IFS}rm -rf ~',
  '$IFS rm -rf /',
  // Variable indirection: the dangerous word never appears as a literal command.
  'X=rm; $X -rf /',
  'CMD=rm && $CMD -rf ~',
  // base64 -> shell. The payload decodes to `rm -rf /`; nothing in the visible
  // text matches any pattern. The pipe-to-shell rule only knew curl and wget.
  'echo cm0gLXJmIC8= | base64 -d | sh',
  'echo cm0gLXJmIC8= | base64 --decode | bash',
  'eval "$(echo cm0gLXJmIC8= | base64 -d)"',
];

const MUST_ALLOW = [
  'git stash apply stash@{0}',
  'git stash pop stash@{2}',
  'git status',
  'rm -rf ./build',
  'git push origin feat/thing',
  // The regression: describing a command inside a commit message is not running it.
  'git commit -m "docs: explain why git stash pop is banned"',
  "git commit -m 'fix: block rm -rf / in the safety net'",
  'git commit -F /tmp/msg.txt',
  // Regression (observed 2026-09-14): `rm` appearing as an *argument* was matched
  // like `rm` in command position, so searching the docs for the string you are
  // forbidden to run was itself forbidden. Only `echo` and commit messages were
  // special-cased; every other consumer of the literal text still tripped.
  'grep -r "rm -rf ~" ./docs',
  'rg "rm -rf /" --glob "*.md"',
  'echo "rm -rf /"',
  // Second regression (observed 2026-09-14, same session): the -f/-r/target
  // lookaheads scanned [\s\S]* — the entire command — so a scratch delete was
  // judged against a `/` belonging to a later, unrelated segment. Both of these
  // delete a relative path and then run something harmless.
  'rm -rf build && ls skills/',
  'rm -rf node_modules && ls /',
  // Guards on the obfuscation rules added 2026-09-14. Each mechanism has an
  // ordinary, frequent, legitimate form, and a guard that blocks those is a guard
  // the user turns off.
  'eval "$(ssh-agent -s)"',          // the canonical eval; blocking it is a non-starter
  'eval "$(direnv hook zsh)"',
  'echo hello | base64',             // encoding is not decoding
  'base64 -d payload.b64 > out.bin', // decoding to a file never reaches a shell
  'IFS=, read -r a b <<< "1,2"',     // IFS as an actual field separator
  'X=hello; echo $X',                // a variable that is not a command
  'curl -s https://api.example.com | jq .',  // a pipe whose sink is not a shell
];

const cases = [
  ['blocks genuinely destructive commands', () => {
    MUST_BLOCK.forEach(c => assert(blocked(c), `should block: ${c}`));
  }],
  ['allows safe commands and explicit stash refs', () => {
    MUST_ALLOW.forEach(c => assert(!blocked(c), `should allow: ${c}`));
  }],
  ['still blocks a real destructive command chained after a commit', () => {
    assert(blocked('git commit -m "wip" && rm -rf ~/'), 'chained rm -rf must still block');
  }],
  ['does not treat a heredoc commit message as executable', () => {
    assert(!blocked("git commit -m \"$(cat <<'EOF'\nchore: note that git stash pop is unsafe\nEOF\n)\""));
  }],
  ['still blocks a heredoc piped into a shell', () => {
    assert(blocked("bash <<'EOF'\nrm -rf ~/\nEOF"), 'heredoc into a shell is executable');
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
console.log(`\nsafety-net: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
