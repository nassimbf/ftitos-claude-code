#!/usr/bin/env node
/**
 * Stop Hook — Ralph Loop Engine
 *
 * Implements the fresh-context loop runner for autonomous iteration.
 * Opt-in only: requires LOOP_GOAL env var to be set. Silent no-op otherwise.
 *
 * Gates (in evaluation order):
 *   1. LOOP_GOAL absent → skip (exit 0)
 *   2. Ledger EXIT_SIGNAL === true → clean exit (exit 0)
 *   3. Current output contains "LOOP:DONE" → write EXIT_SIGNAL, exit 0
 *   4. iteration >= max_iterations → write budget-exhausted entry, exit 0
 *   5. Circuit breaker: 3+ consecutive identical non-empty relay notes → write HALT entry, exit 0
 *   6. error_count > error_threshold → write error-gate entry, exit 0
 *   7. Otherwise → write updated ledger with incremented iteration and relay notes
 *
 * Never exits non-zero. Never kills the session. Purely observational + stateful.
 *
 * State file: ~/.claude/loop-state/goal-ledger.json
 * Beads: appends atomic step claims to ~/.claude/loop-state/bead-log.jsonl
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { readStdinJson, ensureDir, log } = require('./lib/utils');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOOP_STATE_DIR = path.join(os.homedir(), '.claude', 'loop-state');
const LEDGER_PATH = path.join(LOOP_STATE_DIR, 'goal-ledger.json');
const BEAD_LOG_PATH = path.join(LOOP_STATE_DIR, 'bead-log.jsonl');

const DEFAULT_MAX_ITERATIONS = 10;
const DEFAULT_ERROR_THRESHOLD = 3;

const DONE_KEYWORD = 'LOOP:DONE';

// ---------------------------------------------------------------------------
// Ledger I/O
// ---------------------------------------------------------------------------

function readLedger() {
  try {
    const raw = fs.readFileSync(LEDGER_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLedger(ledger) {
  ensureDir(LOOP_STATE_DIR);
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Bead log — append-only atomic step claims
// ---------------------------------------------------------------------------

function appendBead(entry) {
  ensureDir(LOOP_STATE_DIR);
  try {
    fs.appendFileSync(BEAD_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Passive log — never block on write failure
  }
}

// ---------------------------------------------------------------------------
// Hashing helpers
// ---------------------------------------------------------------------------

function sha1(text) {
  return crypto.createHash('sha1').update(String(text)).digest('hex');
}

// ---------------------------------------------------------------------------
// Output extraction — pull relay notes from conversation output
// ---------------------------------------------------------------------------

function extractRelayNotes(payload) {
  // Prefer explicit RELAY_NOTES: block in the tool response, fall back to
  // last 500 chars of assistant output for continuity across iterations.
  const content = payload?.tool_response?.content
    ?? payload?.assistant_response
    ?? payload?.output
    ?? '';

  if (typeof content !== 'string') return '';

  const relayMatch = content.match(/RELAY_NOTES:\s*([\s\S]{1,500}?)(?:\n\n|\n(?=[A-Z_]+:)|$)/);
  if (relayMatch) return relayMatch[1].trim();

  return content.slice(-500).trim();
}

function containsDone(payload) {
  const content = payload?.tool_response?.content
    ?? payload?.assistant_response
    ?? payload?.output
    ?? '';

  return typeof content === 'string' && content.includes(DONE_KEYWORD);
}

// ---------------------------------------------------------------------------
// Default ledger scaffold — created on first run if file is absent
// ---------------------------------------------------------------------------

function buildDefaultLedger(goal) {
  return {
    goal,
    iteration: 0,
    max_iterations: DEFAULT_MAX_ITERATIONS,
    error_count: 0,
    error_threshold: DEFAULT_ERROR_THRESHOLD,
    EXIT_SIGNAL: false,
    relay_notes: '',
    relay_note_hashes: [],
    halt_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Circuit breaker — fires when last 3 non-empty relay notes have identical hashes.
// Empty-string notes (Stop payload has no content field) are skipped to prevent
// false fires on the sha1('') == sha1('') trivial collision.
// ---------------------------------------------------------------------------

function circuitBreakerFired(hashes, currentNotes) {
  if (!currentNotes) return false;
  if (hashes.length < 3) return false;
  const last = hashes[hashes.length - 1];
  const prev = hashes[hashes.length - 2];
  const prev2 = hashes[hashes.length - 3];
  return last === prev && prev === prev2;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const goal = process.env.LOOP_GOAL;
  if (!goal) {
    // Opt-in gate — skip silently when env var absent
    process.exit(0);
  }

  const payload = await readStdinJson();

  // Load or initialise ledger
  let ledger = readLedger();
  if (!ledger) {
    ledger = buildDefaultLedger(goal);
    log(`[ralph-loop] No ledger found — initialising for goal: "${goal}"`);
  }

  const maxIterations = ledger.max_iterations ?? DEFAULT_MAX_ITERATIONS;
  const errorThreshold = ledger.error_threshold ?? DEFAULT_ERROR_THRESHOLD;
  const now = new Date().toISOString();

  // Gate 1 — ledger already signals clean exit
  if (ledger.EXIT_SIGNAL === true) {
    appendBead({
      ts: now,
      iteration: ledger.iteration,
      event: 'skip:exit_signal_already_set',
      goal,
    });
    log('[ralph-loop] EXIT_SIGNAL already set — clean exit, no action needed');
    process.exit(0);
  }

  const relayNotes = extractRelayNotes(payload);
  const notesHash = sha1(relayNotes);
  const updatedHashes = [...(ledger.relay_note_hashes ?? []), notesHash];

  // Gate 2 — LOOP:DONE keyword in current output
  if (containsDone(payload)) {
    const updatedLedger = {
      ...ledger,
      EXIT_SIGNAL: true,
      relay_notes: relayNotes,
      relay_note_hashes: updatedHashes,
      halt_reason: 'LOOP:DONE keyword detected in output',
      updated_at: now,
    };
    writeLedger(updatedLedger);
    appendBead({
      ts: now,
      iteration: ledger.iteration,
      event: 'exit:done_keyword',
      goal,
      notes_hash: notesHash,
    });
    log('[ralph-loop] LOOP:DONE detected — EXIT_SIGNAL written, loop complete');
    process.exit(0);
  }

  // Gate 3 — max iterations budget exhausted
  if (ledger.iteration >= maxIterations) {
    const updatedLedger = {
      ...ledger,
      EXIT_SIGNAL: true,
      relay_notes: relayNotes,
      relay_note_hashes: updatedHashes,
      halt_reason: `Max iterations reached: ${ledger.iteration}/${maxIterations}`,
      updated_at: now,
    };
    writeLedger(updatedLedger);
    appendBead({
      ts: now,
      iteration: ledger.iteration,
      event: 'exit:max_iterations',
      goal,
      notes_hash: notesHash,
    });
    log(`[ralph-loop] Budget exhausted — ${ledger.iteration}/${maxIterations} iterations`);
    process.exit(0);
  }

  // Gate 4 — circuit breaker (last 3 non-empty relay-note hashes identical)
  if (circuitBreakerFired(updatedHashes, relayNotes)) {
    const updatedLedger = {
      ...ledger,
      EXIT_SIGNAL: true,
      relay_notes: relayNotes,
      relay_note_hashes: updatedHashes,
      halt_reason: `Circuit breaker: 3 consecutive iterations produced identical relay notes (hash ${notesHash})`,
      updated_at: now,
    };
    writeLedger(updatedLedger);
    appendBead({
      ts: now,
      iteration: ledger.iteration,
      event: 'halt:circuit_breaker',
      goal,
      notes_hash: notesHash,
    });
    log(`[ralph-loop] Circuit breaker fired — identical output on last 3 iterations (hash ${notesHash})`);
    process.exit(0);
  }

  // Gate 5 — error count exceeds threshold
  if ((ledger.error_count ?? 0) > errorThreshold) {
    const updatedLedger = {
      ...ledger,
      EXIT_SIGNAL: true,
      relay_notes: relayNotes,
      relay_note_hashes: updatedHashes,
      halt_reason: `Error gate: error_count ${ledger.error_count} exceeds threshold ${errorThreshold}`,
      updated_at: now,
    };
    writeLedger(updatedLedger);
    appendBead({
      ts: now,
      iteration: ledger.iteration,
      event: 'halt:error_gate',
      goal,
      error_count: ledger.error_count,
    });
    log(`[ralph-loop] Error gate triggered — ${ledger.error_count} errors > threshold ${errorThreshold}`);
    process.exit(0);
  }

  // All gates passed — advance iteration and persist relay notes
  const updatedLedger = {
    ...ledger,
    iteration: ledger.iteration + 1,
    relay_notes: relayNotes,
    relay_note_hashes: updatedHashes,
    updated_at: now,
  };
  writeLedger(updatedLedger);
  appendBead({
    ts: now,
    iteration: updatedLedger.iteration,
    event: 'advance',
    goal,
    notes_hash: notesHash,
  });
  log(`[ralph-loop] Iteration ${updatedLedger.iteration}/${maxIterations} — relay notes written`);

  process.exit(0);
}

main().catch(err => {
  log(`[ralph-loop] Unexpected error: ${err.message}`);
  process.exit(0);
});
