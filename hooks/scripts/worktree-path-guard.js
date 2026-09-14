#!/usr/bin/env node
/**
 * PreToolUse Hook: keep writes inside the worktree you are working in.
 *
 * Ported from open-gsd/gsd-core's gsd-worktree-path-guard.js (their issue #260).
 * An agent working in a worktree issues an Edit with an absolute path rooted at
 * the MAIN checkout and silently edits the wrong tree. Upstream had a prose
 * guard for this in an agent definition; the model under load skipped it, so
 * they moved the constraint to the tooling layer. Same reasoning as the write
 * guard: an instruction is a thing a model can form a view about.
 *
 * Scope:
 *   Active   — only when cwd is inside a LINKED worktree. In the main checkout
 *              there is no containment boundary to enforce.
 *   Blocks   — Edit / Write / MultiEdit whose file_path is absolute and resolves
 *              outside the worktree root.
 *   Ignores  — relative paths (they already resolve against cwd), and reads.
 *
 * Fails OPEN. If the worktree root cannot be resolved there is nothing to check
 * against, and a containment check that cannot determine containment must not
 * become a general-purpose write blocker.
 */

'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const { readStdinJson, output, log } = require('./lib/utils');

const GUARDED_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

// Inherited GIT_DIR / GIT_INDEX_FILE would make rev-parse answer for whatever
// repo the ambient environment points at rather than the cwd we are guarding.
// Drop them so the probe always describes where the tool call will actually land.
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: GIT_ENV,
  }).trim();
}

// A linked worktree's git-dir contains a `.git/worktrees/<name>` component.
// The main checkout returns `.git` (or a path without /worktrees/). Checking the
// git-dir rather than the toplevel works from any subdirectory.
function linkedWorktreeRoot() {
  try {
    const gitDir = git('rev-parse', '--git-dir');
    if (!gitDir.split(path.sep).includes('worktrees')) return null;
    return git('rev-parse', '--show-toplevel');
  } catch {
    return null; // not a repo, or git unavailable
  }
}

// realpath, but tolerant of paths that do not exist yet. A Write creating
// `<worktree>/new/dir/file.txt` has no resolvable parent, so resolve the nearest
// existing ancestor and re-append the rest. Resolving only one side of the
// comparison is what makes a symlinked tmpdir look like an escape.
function realpathish(target) {
  const fs = require('fs');
  let head = path.resolve(target);
  const tail = [];
  for (;;) {
    try { return path.join(fs.realpathSync(head), ...tail); } catch { /* keep climbing */ }
    const parent = path.dirname(head);
    if (parent === head) return path.resolve(target); // reached the root
    tail.unshift(path.basename(head));
    head = parent;
  }
}

function isInside(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function main() {
  const input = await readStdinJson();
  if (!input || !GUARDED_TOOLS.has(input.tool_name)) return output({});

  const filePath = input.tool_input && input.tool_input.file_path;
  // Relative paths resolve against cwd, which is already inside the worktree.
  if (!filePath || !path.isAbsolute(filePath)) return output({});

  const root = linkedWorktreeRoot();
  if (!root) return output({});

  // Both sides must be resolved the same way or a symlinked prefix
  // (/var -> /private/var on macOS) makes the worktree look outside itself.
  const resolvedRoot = realpathish(root);
  const resolvedTarget = realpathish(filePath);

  if (isInside(resolvedRoot, resolvedTarget)) return output({});

  log(`worktree-path-guard: blocked ${input.tool_name} on ${filePath} (worktree ${resolvedRoot})`);
  return output({
    decision: 'block',
    reason:
      `worktree-path-guard: ${filePath} is outside this worktree (${resolvedRoot}). You are working ` +
      `in a linked worktree, so an absolute path into another checkout edits a tree nobody is ` +
      `watching — and the change will not appear in this branch's diff. Use a path inside the ` +
      `worktree, or a relative path.`,
  });
}

main();
