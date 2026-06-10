#!/usr/bin/env node
/**
 * Stop Hook — Fresh-Context Loop Runner (Mode 2)
 *
 * Runs a task queue across successive fresh-context Claude invocations.
 * Opt-in via LOOP_RUNNER_LEDGER env var pointing to a goal-ledger.json file.
 *
 * Dual exit gate: task advances only when validation_command exits 0.
 * Circuit breaker: 5 consecutive completes on same task → pending_for_human.md
 * Error gate: 3 retries per task → pending_for_human.md, advance to next task
 * Relay notes: appended to SHARED_TASK_NOTES.md in same directory as ledger
 *
 * Ledger schema (goal-ledger.json):
 * {
 *   goal: string,
 *   tasks: [{ task: string, validation_command: string }],
 *   current_task_index: number,
 *   iteration: number,
 *   max_iterations: number,
 *   retry_count: number,
 *   consecutive_complete: number,
 *   EXIT_SIGNAL: boolean,
 *   halt_reason: string | null,
 *   relay_notes: string,
 *   cwd: string | null,
 *   created_at: string,
 *   updated_at: string
 * }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readStdinJson, ensureDir, log } = require('./lib/utils');

const MAX_CONSECUTIVE_COMPLETE = 5;
const MAX_RETRIES = 3;

function readLedger(ledgerPath) {
  try {
    return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeLedger(ledgerPath, ledger) {
  ensureDir(path.dirname(ledgerPath));
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

function appendRelayNotes(notesPath, iteration, taskLabel, result, notes) {
  const ts = new Date().toISOString();
  const lines = [
    `\n## Iteration ${iteration} — ${ts}`,
    `Task: ${taskLabel}`,
    `Result: ${result}`,
  ];
  if (notes) lines.push(`Notes: ${notes}`);
  try {
    fs.appendFileSync(notesPath, lines.join('\n') + '\n', 'utf8');
  } catch {
    // Passive relay log — never block on write failure
  }
}

function appendPendingForHuman(pendingPath, entry) {
  const ts = new Date().toISOString();
  try {
    ensureDir(path.dirname(pendingPath));
    fs.appendFileSync(pendingPath, `\n## ${ts}\n${entry}\n`, 'utf8');
  } catch {
    // Non-fatal
  }
}

function runValidation(cmd, cwd) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const ledgerPath = process.env.LOOP_RUNNER_LEDGER;
  if (!ledgerPath) {
    process.exit(0);
  }

  await readStdinJson();  // drain Stop hook payload (not used by this runner)

  const ledger = readLedger(ledgerPath);
  if (!ledger) {
    log(`[loop-runner] Ledger not found at ${ledgerPath} — exit`);
    process.exit(0);
  }

  const notesPath = path.join(path.dirname(ledgerPath), 'SHARED_TASK_NOTES.md');
  const pendingPath = path.join(path.dirname(ledgerPath), 'pending_for_human.md');
  const cwd = ledger.cwd || process.cwd();
  const now = new Date().toISOString();
  const maxIterations = ledger.max_iterations ?? 40;

  // Gate 1 — clean exit already signaled
  if (ledger.EXIT_SIGNAL === true) {
    log('[loop-runner] EXIT_SIGNAL already set — loop complete');
    process.exit(0);
  }

  // Gate 2 — budget exhausted
  if (ledger.iteration >= maxIterations) {
    const updated = { ...ledger, EXIT_SIGNAL: true, halt_reason: `Max iterations reached: ${ledger.iteration}/${maxIterations}`, updated_at: now };
    writeLedger(ledgerPath, updated);
    log(`[loop-runner] Budget exhausted — ${ledger.iteration}/${maxIterations}`);
    process.exit(0);
  }

  const tasks = ledger.tasks ?? [];
  const currentIndex = ledger.current_task_index ?? 0;

  // Gate 3 — queue empty
  if (currentIndex >= tasks.length) {
    const updated = { ...ledger, EXIT_SIGNAL: true, halt_reason: 'All tasks complete', updated_at: now };
    writeLedger(ledgerPath, updated);
    log('[loop-runner] All tasks complete — EXIT_SIGNAL written');
    process.exit(0);
  }

  const currentTask = tasks[currentIndex];
  const taskLabel = currentTask.task ?? `task-${currentIndex}`;
  const validationCmd = currentTask.validation_command ?? null;
  const retryCount = ledger.retry_count ?? 0;
  const consecutiveComplete = ledger.consecutive_complete ?? 0;

  const validationPassed = validationCmd ? runValidation(validationCmd, cwd) : true;

  let result;
  let nextIndex = currentIndex;
  let nextRetryCount = retryCount;
  let nextConsecutiveComplete = consecutiveComplete;

  if (validationPassed) {
    nextConsecutiveComplete += 1;
    result = 'COMPLETE';

    // Circuit breaker — 5 consecutive completes on same task
    if (nextConsecutiveComplete >= MAX_CONSECUTIVE_COMPLETE) {
      const msg = `CIRCUIT BREAKER TRIGGERED: ${nextConsecutiveComplete} consecutive complete signals on task "${taskLabel}". Task may be stale or validation_command may be misconfigured.`;
      appendPendingForHuman(pendingPath, msg);
      const updated = { ...ledger, EXIT_SIGNAL: true, halt_reason: msg, updated_at: now };
      writeLedger(ledgerPath, updated);
      log(`[loop-runner] Circuit breaker fired on task: ${taskLabel}`);
      process.exit(0);
    }

    nextIndex = currentIndex + 1;
    nextRetryCount = 0;
    nextConsecutiveComplete = 0;
  } else {
    nextRetryCount += 1;
    result = nextRetryCount >= MAX_RETRIES ? 'PENDING_HUMAN' : 'RETRY';

    if (nextRetryCount >= MAX_RETRIES) {
      const msg = `Task "${taskLabel}" failed ${nextRetryCount} times.\nvalidation_command: ${validationCmd}`;
      appendPendingForHuman(pendingPath, msg);
      nextIndex = currentIndex + 1;
      nextRetryCount = 0;
      log(`[loop-runner] Error gate: advancing past "${taskLabel}" after ${MAX_RETRIES} failures`);
    }
  }

  appendRelayNotes(notesPath, ledger.iteration + 1, taskLabel, result, ledger.relay_notes ?? '');

  const updated = {
    ...ledger,
    iteration: ledger.iteration + 1,
    current_task_index: nextIndex,
    retry_count: nextRetryCount,
    consecutive_complete: nextConsecutiveComplete,
    updated_at: now,
  };

  if (nextIndex >= tasks.length) {
    updated.EXIT_SIGNAL = true;
    updated.halt_reason = 'All tasks complete';
  }

  writeLedger(ledgerPath, updated);
  log(`[loop-runner] Iteration ${updated.iteration}/${maxIterations} — ${result} — task: ${taskLabel}`);

  process.exit(0);
}

main().catch(err => {
  log(`[loop-runner] Unexpected error: ${err.message}`);
  process.exit(0);
});
