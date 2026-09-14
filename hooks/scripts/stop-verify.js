#!/usr/bin/env node
/**
 * Stop Hook — Deterministic verification chain: ruff → mypy → pytest
 *
 * Silent on success (exit 0). Hard-blocks on failure (exit 2) with structured
 * JSON that re-engages Claude with the full error output.
 *
 * Only runs when a Python project is detected (pyproject.toml or setup.py).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log, commandExists, getGitModifiedFiles } = require('./lib/utils');

const VERIFIERS = [
  { tool: 'ruff',  args: 'check .',       label: 'ruff'  },
  { tool: 'mypy',  args: '.',             label: 'mypy'  },
  { tool: 'pytest', args: '--tb=short -q', label: 'pytest' },
];

// A global tool (e.g. Homebrew pytest on a different Python) cannot see the
// project's installed packages. Walk up from cwd (max 4 levels) looking for
// the nearest project root that has a .venv or uv.lock, then prefer uv run
// (reliable venv activation) over direct .venv binary invocation.
function findProjectRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 4; i++) {
    if (
      fs.existsSync(path.join(dir, 'uv.lock')) ||
      fs.existsSync(path.join(dir, '.venv'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

function resolveTool(cwd, tool) {
  const projectRoot = findProjectRoot(cwd);

  // Prefer uv run when uv.lock is present — it activates the managed venv reliably.
  if (fs.existsSync(path.join(projectRoot, 'uv.lock')) && commandExists('uv')) {
    return `uv --project ${projectRoot} run ${tool}`;
  }

  const venvBin = path.join(projectRoot, '.venv', 'bin', tool);
  if (fs.existsSync(venvBin)) {
    return venvBin;
  }

  // A .venv exists but lacks this tool — skip rather than run a global binary
  // against the wrong interpreter.
  if (fs.existsSync(path.join(projectRoot, '.venv'))) {
    return null;
  }

  return commandExists(tool) ? tool : null;
}

function isPythonProject(cwd) {
  const root = findProjectRoot(cwd);
  return (
    fs.existsSync(path.join(root, 'pyproject.toml')) ||
    fs.existsSync(path.join(root, 'setup.py'))
  );
}

// Map changed .py files to their workspace-package test dirs so verification
// is scoped to what changed. A whole-repo pytest inside a git worktree collects
// sibling packages whose optional deps / namespaces aren't installed in the
// worktree env and dies at collection (a false failure). Returns [] when
// nothing maps — the caller then keeps the original whole-repo behaviour for
// plain (non-workspace) repos.
function pytestTargets(modifiedFiles, root) {
  const pkgs = new Set();
  for (const file of modifiedFiles) {
    const match = file.match(/^((?:libs|agents|apps)\/[^/]+)\//);
    if (match) pkgs.add(match[1]);
  }
  const targets = [];
  for (const pkg of pkgs) {
    if (fs.existsSync(path.join(root, pkg, 'tests'))) {
      targets.push(`${pkg}/tests`);
    }
  }
  return targets;
}

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function editedPathsInLine(line) {
  if (!line.trim()) return [];
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return [];
  }
  const content = row.message && row.message.content;
  if (!Array.isArray(content)) return [];
  return content
    .filter(block => block.type === 'tool_use' && EDIT_TOOLS.has(block.name))
    .map(block => (block.input || {}).file_path || (block.input || {}).notebook_path)
    .filter(Boolean);
}

// Which files this session itself edited, repo-relative, or null when the
// transcript cannot be read. Several Claude sessions can share one working
// tree and `git status` cannot tell them apart: without this the hook reports
// another session's half-finished work as this one's failure and never clears.
// Edits made through Bash are invisible here, so an unreadable transcript
// falls back to verifying everything git reports rather than nothing.
function sessionEditedFiles(transcriptPath, root) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  } catch {
    return null;
  }
  const edited = new Set();
  for (const line of lines) {
    for (const file of editedPathsInLine(line)) {
      edited.add(path.relative(root, path.resolve(root, file)));
    }
  }
  return edited;
}

// Scope mypy to the changed files. `mypy .` is wrong in a repo whose sources
// live under several roots: A3-core has three roots that each hold a package
// named `tests`, so one run from the top sees a file under two module names and
// dies before checking anything. That repo's own pyproject says so, and its CI
// runs mypy per root rather than once from above. Deleted files are dropped —
// git reports them as modified and mypy cannot open them.
function mypyTargets(modifiedFiles, root) {
  return modifiedFiles.filter(file => fs.existsSync(path.join(root, file)));
}

function runVerifier(cmd, cwd) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
    return { ok: true, output: '' };
  } catch (err) {
    const output = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
    return { ok: false, output };
  }
}

function hardBlock(label, output) {
  const context = `VERIFICATION FAILED:\n${label}: ${output}`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: context,
      },
    })
  );
  process.exit(2);
}

async function main() {
  let payload = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload = JSON.parse(chunks.join(''));
  } catch {
    // stdin absent or malformed — fall through
  }

  const rawCwd = payload.cwd || process.cwd();
  const cwd = findProjectRoot(rawCwd);

  if (!isPythonProject(cwd)) {
    log('[stop-verify] No Python project detected — skipping');
    process.exit(0);
  }

  // Pass a STRING pattern — getGitModifiedFiles skips non-string (RegExp)
  // patterns, which would silently disable the .py filter and fire on any
  // modified file (e.g. docs / state files).
  const modifiedPy = getGitModifiedFiles(['\\.py$']);
  if (modifiedPy.length === 0) {
    log('[stop-verify] No .py files modified — skipping');
    process.exit(0);
  }

  const ourEdits = sessionEditedFiles(payload.transcript_path, cwd);
  const changedPy =
    ourEdits === null ? modifiedPy : modifiedPy.filter(file => ourEdits.has(file));
  if (changedPy.length === 0) {
    log('[stop-verify] No .py file changed by this session — skipping');
    process.exit(0);
  }

  const scopedPytest = pytestTargets(changedPy, cwd);
  const scopedMypy = mypyTargets(changedPy, cwd);

  for (const { tool, args, label } of VERIFIERS) {
    const bin = resolveTool(cwd, tool);
    if (!bin) {
      log(`[stop-verify] ${label} not found — skipping`);
      continue;
    }
    if (tool === 'mypy' && scopedMypy.length === 0) {
      log('[stop-verify] mypy — every changed .py file is deleted, skipping');
      continue;
    }
    // Scope pytest to the changed workspace packages when resolvable, and mypy
    // to the changed files themselves.
    const effectiveArgs =
      tool === 'pytest' && scopedPytest.length > 0
        ? `${args} ${scopedPytest.join(' ')}`
        : tool === 'mypy'
          ? scopedMypy.map(file => JSON.stringify(file)).join(' ')
          : args;
    const cmd = bin.startsWith('uv ')
      ? `${bin} ${effectiveArgs}`
      : `${JSON.stringify(bin)} ${effectiveArgs}`;
    const result = runVerifier(cmd, cwd);
    if (!result.ok) {
      hardBlock(label, result.output);
    }
  }

  process.exit(0);
}

// Run as a hook; require as a module. Without the guard, `require()`ing this
// file to unit-test the pure helpers would execute main() and try to verify the
// test runner's own working tree.
if (require.main === module) {
  main().catch(err => {
    log(`[stop-verify] Unexpected error: ${err.message}`);
    process.exit(0);
  });
}

module.exports = { editedPathsInLine, sessionEditedFiles, mypyTargets, pytestTargets };
