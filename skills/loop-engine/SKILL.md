---
name: loop-engine
description: Two-mode loop system — in-session /goal evaluation and overnight fresh-context runner with dual exit gate, circuit breaker, error gate, and relay notes.
origin: frankbria/ralph + continuous-claude + ralphex
---

# Loop Engine

Two modes for different time horizons. Pick the right one before you start.

| Situation | Mode |
|---|---|
| Interactive session, want to keep iterating on one goal | In-session |
| Overnight / unattended / budget-constrained multi-step work | Fresh-context |

---

## Mode 1 — In-Session Loop

### Native `/goal`

Use when you want Claude to keep iterating until a goal is met, with a separate model
evaluating completion (not self-report, which is too weak).

```
/goal "All pytest tests in saa/engine/areas/fixed_assets pass with ≥80% coverage"
```

A separate Haiku instance evaluates each iteration's output against the goal string.
The loop breaks only when Haiku returns COMPLETE. This is strictly stronger than
asking the working model to declare itself done.

**Haiku judge prompt (internal):**

```
You are a completion judge. Given the goal and the agent's last output, respond
with exactly COMPLETE or CONTINUE and one sentence of reasoning.
Goal: {goal}
Last output: {output}
```

### ralph-loop Stop Hook (built-in replacement)

The `ralph-loop` npm plugin does not exist in the Claude Code marketplace.
This harness ships a drop-in replacement as a Stop hook script.

**Script location:**
```
hooks/scripts/ralph-loop.js
```

**Activation — opt-in via env var (not in hooks.json):**

```bash
LOOP_GOAL="Refactor graph_v2 nodes to use early returns" claude
```

The hook is a no-op when `LOOP_GOAL` is absent, so it is safe to leave wired
into your settings without affecting normal sessions.

**Manual wiring (add to `.claude/settings.json` Stop hooks array):**

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "node ~/.claude/hooks/scripts/ralph-loop.js",
        "description": "Ralph loop engine — fresh-context runner with dual exit gate"
      }
    ]
  }
}
```

**State files (all under `~/.claude/loop-state/`):**

| File | Purpose |
|------|---------|
| `goal-ledger.json` | Single source of truth — read first, written last each iteration |
| `bead-log.jsonl` | Append-only atomic step claims (Beads-compatible) |

**Pre-seeding the ledger (optional — hook auto-creates on first run):**

```json
{
  "goal": "Refactor graph_v2 nodes to use early returns",
  "iteration": 0,
  "max_iterations": 12,
  "error_count": 0,
  "error_threshold": 3,
  "EXIT_SIGNAL": false,
  "relay_notes": "",
  "relay_note_hashes": [],
  "halt_reason": null
}
```

Save to `~/.claude/loop-state/goal-ledger.json` before the first session if you
want a custom `max_iterations` or `error_threshold`. Otherwise defaults are
`max_iterations: 10` and `error_threshold: 3`.

**Signal Claude to end the loop early:**

Include `LOOP:DONE` anywhere in your output. The hook detects it, sets
`EXIT_SIGNAL: true` in the ledger, and stops iterating.

**Pass relay notes to the next iteration:**

Include a `RELAY_NOTES:` block in your output:

```
RELAY_NOTES: Opening balance node passes. Rollforward fails on zero-addition
edge case — see test_rollforward.py:88.
```

The hook extracts and persists this to the ledger. The next session reads
the ledger before starting, giving continuity without bloating the context.

**When to prefer ralph-loop over `/goal`:** when you need a hard iteration
budget, want Beads-compatible step claims in `bead-log.jsonl`, or need
overnight/unattended runs where self-report completion is too weak.

---

## Mode 2 — Fresh-Context Loop (Overnight / Long-Running)

Huntley doctrine: one task per loop, identical context allocation each iteration,
filesystem as shared state. The runner is a Stop hook plus a thin state file.

### Setup

1. Create `goal-ledger.json` at your project root (see schema below).
2. Install the Stop hook (one line in `settings.json`).
3. Run `claude` normally — the hook takes over from there.

**Stop hook entry in `.claude/settings.json`:**

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "node ~/.claude/hooks/scripts/loop-runner.js",
        "description": "Fresh-context loop runner"
      }
    ]
  }
}
```

### The Eight Patterns

**1. Dual Exit Gate (frankbria)**

The loop exits only when BOTH conditions hold:
- The task's `validation_command` exits 0.
- `EXIT_SIGNAL: true` is written to `goal-ledger.json`.

Neither condition alone is sufficient. This prevents premature exit from a passing
validation command that ran against stale state.

**2. Circuit Breaker (frankbria)**

After 5 consecutive iterations where `consecutive_complete` increments without
the ledger's `current_task` changing, the runner force-exits and writes:

```
CIRCUIT BREAKER TRIGGERED: 5 consecutive complete signals on same task.
Task may be stale or validation_command may be misconfigured.
```

to `pending_for_human.md` before stopping.

**3. Error Gate (yurukusa taxonomy)**

Each task gets 3 retries. On the 3rd failure:
- Log the error + stack trace to `pending_for_human.md`.
- Advance `current_task` to the next item in the queue.
- Do NOT halt the loop.

This prevents a single broken task from freezing an overnight run. Human reviews
`pending_for_human.md` in the morning.

**4. Validation Commands in Plan Files (ralphex)**

Every task entry in the ledger carries a `validation_command`. The runner executes
it after each iteration. If exit code ≠ 0, the task is not marked complete.

```json
{
  "task": "Add depreciation rollforward node",
  "validation_command": "pytest agents/fixed-assets/tests/test_rollforward.py -q"
}
```

Machine-verifiable gates — no LLM self-assessment involved.

**5. Relay-Race Notes (continuous-claude)**

At the end of each iteration the runner appends to `SHARED_TASK_NOTES.md`:

```
## Iteration {n} — {timestamp}
Task: {current_task}
Result: {COMPLETE|RETRY|PENDING_HUMAN}
Notes: {relay_notes from ledger}
```

The next iteration reads the file before starting, giving the fresh context access
to what the previous session discovered. "Make meaningful progress on one thing,
leave notes."

**6. Resume-Here Block**

`goal-ledger.json` is the single canonical state file. It always contains enough
information to resume a halted run from scratch — no other file is required.
The runner reads it first, writes it last.

**7. Triple Budget**

Set all three limits before starting an overnight run:

```bash
claude --max-turns 40
```

Wall-clock expiry: set a system cron or launchd job to `pkill -f "claude"` at your
deadline. The Stop hook writes a clean checkpoint to `goal-ledger.json` before each
exit, so a wall-clock kill is always safe to resume from.

Note: `--max-budget-usd` is not a supported Claude CLI flag. Use `--max-turns` for
iteration limits and rely on cron for wall-clock budget enforcement.

Spawn budget for subagents: if your tasks spawn sub-`claude` calls, track their
cumulative cost in the ledger's `subagent_usd` field and abort spawning when
`subagent_usd > spawn_budget_usd`.

**8. Stagnation Design (Beads `bd ready`)**

The loop never asks "what should I do next?" — the answer is always `bd ready`
(dependency-aware next work) or the next item in the ledger's task queue. A loop
that can stall waiting for instruction is not a loop.

---

## Stop Hook Runner Logic (pseudocode)

```
read goal-ledger.json
if EXIT_SIGNAL == true → log "clean exit", stop
if iteration > max_iterations → log "budget exhausted", stop
run current_task.validation_command
if exit_code == 0:
    consecutive_complete += 1
    if consecutive_complete >= 5 → circuit breaker, stop
    advance to next task (or set EXIT_SIGNAL = true if queue empty)
else:
    retry_count += 1
    if retry_count >= 3 → log to pending_for_human.md, advance task, reset retry_count
append relay_notes to SHARED_TASK_NOTES.md
increment iteration
write goal-ledger.json
re-invoke: claude --resume --max-turns {remaining}
```

---

## Choosing Between Modes

Use **in-session** when:
- You are watching the terminal.
- The goal can be achieved in < 30 minutes.
- You want immediate intervention capability.

Use **fresh-context** when:
- The work spans multiple hours or overnight.
- You have a queue of discrete tasks (not one open-ended goal).
- Budget and blast-radius containment matter more than speed.
- You need a human-readable audit trail (`SHARED_TASK_NOTES.md`).

Never run fresh-context mode without setting `--max-budget-usd`. An uncapped
overnight loop against Sonnet at agentic token rates can exceed $100.
