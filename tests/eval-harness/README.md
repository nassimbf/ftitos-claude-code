# Eval Harness

Deterministic golden task harness for measuring agent capability regression.
Tasks originate from real agent failures (Hashimoto rule). The CI gate blocks builds
when any task's pass rate drops more than 0.30 below its stored baseline.

## Directory Structure

```
tests/eval-harness/
├── README.md              — this file
├── run-evals.js           — eval runner (5-run protocol, baseline comparison)
├── baseline.json          — stored pass-rate baselines per task
├── results/               — per-run JSONL logs (gitignored if noisy)
├── archive/               — graduated tasks (100% pass, 10+ runs, 6+ months)
│   └── ARCHIVE-LOG.md     — record of why/when each task was archived
└── tasks/
    ├── _template/         — copy this to start a new task
    └── task-NNN-<name>/
        ├── prompt.md      — frozen task wording (changes = new task number)
        ├── repo-state/    — git patch or fixture files for initial state
        ├── checks.py      — deterministic pass/fail assertions (no LLM)
        └── metadata.json  — { difficulty, area, tags }
```

## Running Evals

```bash
# Run all tasks (5 runs each), compare to baseline:
node tests/eval-harness/run-evals.js

# Run a single task:
node tests/eval-harness/run-evals.js --task task-001-stop-verify

# Update baseline after a deliberate improvement:
node tests/eval-harness/run-evals.js --update-baseline task-001-stop-verify
```

## Adding a New Task

1. Copy the template directory: `cp -r tests/eval-harness/tasks/_template tests/eval-harness/tasks/task-NNN-name`
2. Write `prompt.md` with the exact wording the agent receives (freeze it at creation).
3. Create `repo-state/` with the minimal fixture that sets up the initial state.
4. Write `checks.py` — deterministic assertions only (no LLM, no network, no randomness).
5. Fill in `metadata.json`.
6. Run 5 times and record baseline if `pass_rate >= 0.60`.

## CI Gate

The build fails if any task's `pass_rate` drops more than **0.30** below `baseline.json`.
Example: baseline 0.80, current 0.40 → delta 0.40 > threshold 0.30 → build fails.

Baselines are updated manually — never auto-updated to hide regressions.
