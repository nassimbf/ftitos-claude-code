# Loop State Schema Reference

Three files. The runner reads and writes all three; humans only read them.

---

## `goal-ledger.json`

Single source of truth. Runner reads this first, writes it last every iteration.

```json
{
  "current_task": "Add depreciation rollforward node to graph_v2",
  "validation_command": "pytest agents/fixed-assets/tests/test_rollforward.py -q",
  "iteration": 4,
  "max_iterations": 40,
  "consecutive_complete": 0,
  "retry_count": 0,
  "EXIT_SIGNAL": false,
  "spawn_budget_usd": 2.00,
  "subagent_usd": 0.34,
  "relay_notes": "Opening balance node passes. Rollforward fails on zero-addition edge case — see test_rollforward.py:88.",
  "pending_for_human": [],
  "queue": [
    {
      "task": "Wire rollforward output to SubledgerRecon node",
      "validation_command": "pytest agents/fixed-assets/tests/test_subledger_recon.py -q"
    },
    {
      "task": "Run full FA graph smoke test",
      "validation_command": "pytest agents/fixed-assets/tests/ -q --tb=short"
    }
  ]
}
```

**Field rules:**
- `EXIT_SIGNAL`: runner sets to `true` when queue is empty and last validation passes. Never set manually mid-run.
- `consecutive_complete`: resets to 0 whenever `current_task` changes. Circuit breaker fires at 5.
- `retry_count`: resets to 0 whenever `current_task` changes. Error gate fires at 3.
- `queue`: ordered list. Runner pops the first item into `current_task` on task advance.
- `pending_for_human`: append-only during a run. Review after run; clear manually.

---

## `SHARED_TASK_NOTES.md`

Relay notes. Each iteration appends one block. The next fresh context reads this
before starting work, giving continuity across sessions without bloating the ledger.

```markdown
## Iteration 3 — 2026-06-10T02:14:07Z
Task: Add depreciation rollforward node to graph_v2
Result: RETRY
Notes: Zero-addition edge case fails at test_rollforward.py:88. Asset with
no movements in period → division by zero in rate calc. Fix: guard with
`if total_additions == 0: return Decimal("0")` before rate computation.

## Iteration 4 — 2026-06-10T02:31:52Z
Task: Add depreciation rollforward node to graph_v2
Result: COMPLETE
Notes: Zero-addition guard fixed. All 14 rollforward tests pass. Advancing
to SubledgerRecon node wiring.
```

**Format rule:** always include Result as one of `COMPLETE`, `RETRY`, or `PENDING_HUMAN`.
Keep Notes under 5 lines — the next session reads this in its preamble, so brevity saves tokens.

---

## `pending_for_human.md`

Error-gate overflow log. Runner appends here when a task exhausts its 3 retries.
Review this after every overnight run before re-queuing anything.

```markdown
## 2026-06-10T03:47:22Z — PENDING HUMAN REVIEW

Task: Wire rollforward output to SubledgerRecon node
Validation: pytest agents/fixed-assets/tests/test_subledger_recon.py -q
Retries exhausted: 3

Last error:
  FAILED tests/test_subledger_recon.py::test_recon_totals_match - AssertionError:
  Expected Decimal('124500.00'), got Decimal('124499.99')
  (Likely floating-point bleed from upstream — check Rollforward.net_book_value type)

Action required: inspect test_subledger_recon.py:42 and confirm Decimal
precision is enforced end-to-end before re-queuing this task.
```

**Format rule:** always include the last raw error output. Without it, the human
cannot diagnose the failure without re-running — defeating the purpose of the log.
