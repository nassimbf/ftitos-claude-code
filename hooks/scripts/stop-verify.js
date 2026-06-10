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
  { tool: 'ruff',  cmd: 'ruff check .',         label: 'ruff'  },
  { tool: 'mypy',  cmd: 'mypy .',               label: 'mypy'  },
  { tool: 'pytest', cmd: 'pytest --tb=short -q', label: 'pytest' },
];

function isPythonProject(cwd) {
  return (
    fs.existsSync(path.join(cwd, 'pyproject.toml')) ||
    fs.existsSync(path.join(cwd, 'setup.py'))
  );
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

  const cwd = payload.cwd || process.cwd();

  if (!isPythonProject(cwd)) {
    log('[stop-verify] No Python project detected — skipping');
    process.exit(0);
  }

  const modifiedPy = getGitModifiedFiles([/\.py$/]);
  if (modifiedPy.length === 0) {
    log('[stop-verify] No .py files modified — skipping');
    process.exit(0);
  }

  for (const { tool, cmd, label } of VERIFIERS) {
    if (!commandExists(tool)) {
      log(`[stop-verify] ${label} not found — skipping`);
      continue;
    }
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
