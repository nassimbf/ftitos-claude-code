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

  const scopedPytest = pytestTargets(modifiedPy, cwd);

  for (const { tool, args, label } of VERIFIERS) {
    const bin = resolveTool(cwd, tool);
    if (!bin) {
      log(`[stop-verify] ${label} not found — skipping`);
      continue;
    }
    // Scope pytest to the changed workspace packages when resolvable.
    const effectiveArgs =
      tool === 'pytest' && scopedPytest.length > 0
        ? `${args} ${scopedPytest.join(' ')}`
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

main().catch(err => {
  log(`[stop-verify] Unexpected error: ${err.message}`);
  process.exit(0);
});
