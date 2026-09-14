#!/usr/bin/env node
/**
 * PreToolUse Hook: do not let the quality bar be edited mid-task.
 *
 * Ported from affaan-m/ecc's scripts/hooks/config-protection.js.
 *
 * The cheat this interrupts: the type checker fails, so the rule goes into the
 * ignore list. The suite goes green and the commit satisfies every other gate
 * here — the regression-test gate, the doctor check, the unskippable pre-commit
 * hook — because all of them ask "does it pass", and this edits what passing
 * means.
 *
 * Creating a config is allowed; a project has to acquire one. Editing an
 * existing one is the move worth stopping to think about, so this blocks with a
 * reason rather than refusing outright — the user can still do it, deliberately.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readStdinJson, output, log } = require('./lib/utils');

const GUARDED_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

// Files that define what "clean" means.
const CONFIG_NAMES = [
  /^\.eslintrc(\.(json|js|cjs|yaml|yml))?$/i,
  /^eslint\.config\.(js|mjs|cjs|ts)$/i,
  /^\.prettierrc(\.(json|js|cjs|yaml|yml))?$/i,
  /^prettier\.config\.(js|mjs|cjs)$/i,
  /^\.?ruff\.toml$/i,
  /^\.?mypy\.ini$/i,
  /^\.flake8$/i,
  /^setup\.cfg$/i,
  /^pyproject\.toml$/i,
  /^tsconfig(\.[a-z]+)?\.json$/i,
  /^pyrightconfig\.json$/i,
  /^\.pylintrc$/i,
  /^biome\.jsonc?$/i,
];

// Vendored copies are not this project's quality bar.
const VENDOR = /(^|\/)(node_modules|vendor|\.venv|venv|site-packages|dist|build)(\/|$)/;

function isProjectConfig(filePath) {
  if (VENDOR.test(filePath)) return false;
  const base = path.basename(filePath);
  return CONFIG_NAMES.some(re => re.test(base));
}

async function main() {
  const input = await readStdinJson();
  if (!input || !GUARDED_TOOLS.has(input.tool_name)) return output({});

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath || !isProjectConfig(filePath)) return output({});

  // Acquiring a config is legitimate. Only an existing one is guarded.
  if (!fs.existsSync(filePath)) return output({});

  log(`config-protection: blocked ${input.tool_name} on ${filePath}`);
  return output({
    decision: 'block',
    reason:
      `config-protection: ${path.basename(filePath)} defines what "passing" means here, and every ` +
      `other gate in this harness asks whether things pass. Editing it mid-task is how a failing ` +
      `check becomes a green one without the defect being fixed. If the tool is genuinely wrong ` +
      `about this code, say so and change it deliberately — that is a decision worth a sentence, ` +
      `not a silent edit.`,
  });
}

main();
