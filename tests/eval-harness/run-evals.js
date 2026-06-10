#!/usr/bin/env node
/**
 * Eval Harness Runner
 *
 * Discovers all task directories under tasks/, runs checks.py for each task
 * that has one, and compares the pass rate against baseline.json.
 *
 * Exit codes:
 *   0 — all checks passed, no regression
 *   1 — regression detected (pass rate dropped > 0.3 below baseline)
 *   2 — fatal error (e.g. baseline.json unreadable)
 *
 * Usage:
 *   node tests/eval-harness/run-evals.js [--update-baseline]
 *
 *   --update-baseline  Write current results to baseline.json instead of comparing
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HARNESS_DIR = path.dirname(__filename || __dirname);
const TASKS_DIR = path.join(HARNESS_DIR, 'tasks');
const BASELINE_PATH = path.join(HARNESS_DIR, 'baseline.json');
const ARCHIVE_DIR = path.join(HARNESS_DIR, 'archive');
const ARCHIVE_LOG = path.join(ARCHIVE_DIR, 'ARCHIVE-LOG.md');
const REGRESSION_THRESHOLD = 0.3;

function discoverTasks() {
  try {
    return fs.readdirSync(TASKS_DIR)
      .filter(name => fs.statSync(path.join(TASKS_DIR, name)).isDirectory())
      .sort();
  } catch {
    return [];
  }
}

function hasChecks(taskDir) {
  return fs.existsSync(path.join(TASKS_DIR, taskDir, 'checks.py'));
}

function runChecks(taskDir) {
  const checksPath = path.join(TASKS_DIR, taskDir, 'checks.py');
  try {
    execSync(`python3 ${checksPath}`, { encoding: 'utf8', stdio: 'pipe' });
    return { passed: true, output: '' };
  } catch (err) {
    const output = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
    return { passed: false, output };
  }
}

function readBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeBaseline(results) {
  const passRate = results.filter(r => r.passed).length / Math.max(results.length, 1);
  const data = {
    recorded_at: new Date().toISOString(),
    pass_rate: passRate,
    tasks_run: results.length,
    tasks_passed: results.filter(r => r.passed).length,
    per_task: Object.fromEntries(results.map(r => [r.task, r.passed])),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return data;
}

function appendArchiveLog(results, passRate) {
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const ts = new Date().toISOString();
  const lines = [
    `\n## ${ts}`,
    `Pass rate: ${(passRate * 100).toFixed(1)}% (${results.filter(r => r.passed).length}/${results.length} tasks with checks.py)`,
    ...results.map(r => `- [${r.passed ? 'PASS' : 'FAIL'}] ${r.task}`),
  ];
  fs.appendFileSync(ARCHIVE_LOG, lines.join('\n') + '\n', 'utf8');
}

function main() {
  const updateBaseline = process.argv.includes('--update-baseline');

  const tasks = discoverTasks();
  const tasksWithChecks = tasks.filter(hasChecks);

  if (tasksWithChecks.length === 0) {
    console.log('[run-evals] No tasks with checks.py found — nothing to run');
    process.exit(0);
  }

  console.log(`[run-evals] Running ${tasksWithChecks.length} task(s) with checks.py`);

  const results = tasksWithChecks.map(taskDir => {
    const result = runChecks(taskDir);
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${taskDir}`);
    if (!result.passed && result.output) {
      console.log(`         ${result.output.split('\n').join('\n         ')}`);
    }
    return { task: taskDir, ...result };
  });

  const passRate = results.filter(r => r.passed).length / results.length;
  appendArchiveLog(results, passRate);

  if (updateBaseline) {
    const baseline = writeBaseline(results);
    console.log(`[run-evals] Baseline updated — pass rate: ${(baseline.pass_rate * 100).toFixed(1)}%`);
    process.exit(0);
  }

  const baseline = readBaseline();
  if (!baseline) {
    console.log('[run-evals] No baseline.json found — run with --update-baseline to create one');
    process.exit(2);
  }

  const regression = baseline.pass_rate - passRate;
  if (regression > REGRESSION_THRESHOLD) {
    console.error(`[run-evals] REGRESSION: pass rate ${(passRate * 100).toFixed(1)}% vs baseline ${(baseline.pass_rate * 100).toFixed(1)}% (delta ${(regression * 100).toFixed(1)}% > ${(REGRESSION_THRESHOLD * 100).toFixed(1)}% threshold)`);
    process.exit(1);
  }

  console.log(`[run-evals] OK — pass rate ${(passRate * 100).toFixed(1)}% (baseline ${(baseline.pass_rate * 100).toFixed(1)}%)`);
  process.exit(0);
}

main();
