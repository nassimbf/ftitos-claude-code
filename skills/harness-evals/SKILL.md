---
name: harness-evals
description: Golden task eval harness — 20 deterministic tasks with checks.py, 5-run protocol, judge calibration, CI gate on >0.3 regression vs baseline. SWE-smith for auto-generation.
origin: harbor-framework/harbor + SWE-bench/SWE-smith
---

# Harness Evals

A deterministic eval harness for measuring agent capability regression. The guiding principle is
the Hashimoto rule: every observed agent failure becomes a permanent engineered fix. The harness
is the artifact that captures those fixes as runnable assertions.

The harness is not a benchmark. It is a regression detector. Tasks come from real failures;
passing rate matters only relative to the last baseline, not in absolute terms.

---

## 1. Golden Task Anatomy

Each task lives in its own directory under `tests/eval-harness/tasks/`:

```
tests/eval-harness/tasks/task-NNN-<name>/
├── prompt.md        — exact task wording given to the agent (wording is frozen; changes = new task)
├── repo-state/      — fixtures or a git patch that establishes the initial repository state
│   ├── setup.sh     — optional: shell script to apply the patch / create fixture files
│   └── *.patch      — git-format-patch output, or raw fixture files
├── checks.py        — deterministic Python assertions (no LLM, no fuzzy matching)
└── metadata.json    — { "difficulty": 1-5, "area": "...", "tags": [...] }
```

**Naming convention:** `task-NNN-<kebab-case-description>`, where NNN is a zero-padded
three-digit number. Numbers are stable identifiers — do not renumber existing tasks when
adding new ones. Append at the next available number.

**Prompt immutability:** The wording in `prompt.md` is frozen at creation. If the task needs
to change, create a new task with a new number. This preserves baseline comparability.

---

## 2. checks.py Contract

`checks.py` is the source of truth for pass/fail.

**Required interface:**

```python
#!/usr/bin/env python3
"""
Deterministic checks for task-NNN-<name>.

Exit 0 → task passed.
Exit 1 → task failed (write failure reason to stderr).

MUST be deterministic: same repo state → same result every run.
MUST NOT call any LLM, network service, or random source.
MUST NOT rely on wall-clock time.
"""
import sys
import subprocess

def main() -> int:
    # Example checks — replace with task-specific assertions:

    # Check: a specific file exists
    from pathlib import Path
    target = Path("hooks/scripts/stop-verify.sh")
    if not target.exists():
        print(f"FAIL: {target} does not exist", file=sys.stderr)
        return 1

    # Check: a function signature is present
    content = target.read_text()
    if "exit 2" not in content:
        print("FAIL: stop-verify.sh does not use exit code 2", file=sys.stderr)
        return 1

    # Check: test suite passes
    result = subprocess.run(
        ["python", "-m", "pytest", "tests/", "-q", "--tb=short"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("FAIL: test suite failed", file=sys.stderr)
        print(result.stdout[-2000:], file=sys.stderr)
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
```

**Allowed check types:**

| Type | Example |
|------|---------|
| File existence | `Path("src/module.py").exists()` |
| File content match | `"expected string" in content` |
| Function/class signature | regex or AST parse |
| Exit code of a command | `subprocess.run(...).returncode` |
| Output hash match | `hashlib.sha256(output).hexdigest() == EXPECTED` |
| Test suite pass | `pytest` subprocess exit 0 |

**Forbidden in checks.py:**

- LLM calls of any kind
- Network requests (mock or real)
- `random` module without a fixed seed
- `datetime.now()` or `time.time()` without mocking
- Assertions that depend on platform-specific paths or line endings without normalization

---

## 3. The 5-Run Protocol

Agent behavior is not deterministic. A single pass or fail is not a signal; five runs are.

**Protocol:**

```bash
# Run a single task 5 times:
for i in {1..5}; do
  node tests/eval-harness/run-task.js task-001-stop-verify
done
```

**Per-task metrics recorded in `tests/eval-harness/results/<task-id>.jsonl`:**

```jsonl
{"run":1,"task":"task-001-stop-verify","passed":true,"tokens":4823,"wall_seconds":47.2,"timestamp":"2026-06-10T..."}
{"run":2,"task":"task-001-stop-verify","passed":true,"tokens":5102,"wall_seconds":51.8,"timestamp":"2026-06-10T..."}
{"run":3,"task":"task-001-stop-verify","passed":false,"tokens":3900,"wall_seconds":38.1,"timestamp":"2026-06-10T..."}
{"run":4,"task":"task-001-stop-verify","passed":true,"tokens":4654,"wall_seconds":44.3,"timestamp":"2026-06-10T..."}
{"run":5,"task":"task-001-stop-verify","passed":true,"tokens":5210,"wall_seconds":53.0,"timestamp":"2026-06-10T..."}
```

**Derived metrics per task:**

```
pass_rate     = pass_count / 5         (e.g. 4/5 = 0.80)
avg_tokens    = mean of token counts
avg_wall_sec  = mean of wall_seconds
```

**Pass threshold:** `pass_rate >= 0.60` (3 of 5 runs). A task at 0.40 is failing; at 0.60 it passes.

**CI gate:** If any task's `pass_rate` drops more than **0.30** below the stored baseline
for that task, the CI build fails. Example: baseline 0.80, current run 0.40 → delta 0.40 > 0.30 → fail.

Baselines are stored in `tests/eval-harness/baseline.json`:

```json
{
  "task-001-stop-verify": { "pass_rate": 0.80, "avg_tokens": 4939, "recorded": "2026-06-10" },
  "task-002-migration-safety": { "pass_rate": 1.00, "avg_tokens": 6200, "recorded": "2026-06-10" }
}
```

Baselines are updated manually after a deliberate capability improvement — not automatically.
Never auto-update a baseline to paper over a regression.

---

## 4. Judge Calibration

20% of tasks (4 of 20) carry a `human_label` field in their metadata:

```json
{
  "difficulty": 2,
  "area": "verification",
  "tags": ["hooks", "ruff"],
  "human_label": {
    "expected_pass_rate": 0.80,
    "labeled_by": "nessim.ben.ftita@gmail.com",
    "labeled_at": "2026-06-10",
    "notes": "Agent typically gets the exit code right but occasionally misses ruff config path"
  }
}
```

**Calibration check:** If the harness-observed `pass_rate` for a human-labeled task
differs from `expected_pass_rate` by more than **0.20** across 3 consecutive baseline
snapshots, the judge (the `checks.py` logic) is mis-calibrated.

Mis-calibration means either:
- `checks.py` is too strict (false failures) → relax the assertion
- `checks.py` is too loose (false passes) → tighten the assertion

Recalibrate by running the task against a known-good agent output and a known-bad agent
output, then adjusting `checks.py` until it correctly distinguishes them.

---

## 5. Failure-Log-to-Task Recipe

Grow the harness from observed failures, not invented scenarios. When an agent fails,
capture it as a structured failure log and manually create the task directory from it.

**Capture a failure (write this when you observe one):**

```bash
mkdir -p .claude/failure-logs
cat > .claude/failure-logs/$(date +%Y-%m-%d)-description.json << 'EOF'
{
  "observed_at": "ISO timestamp",
  "task_description": "what the agent was trying to do",
  "agent_output": "what it actually did",
  "expected_behavior": "what the correct output should be",
  "repo_state_description": "minimal state needed to reproduce",
  "affected_area": "hooks | skills | agents | etc",
  "tags": ["relevant", "tags"]
}
EOF
```

**Convert to a task (manual recipe):**

1. Create `tests/eval-harness/tasks/task-NNN-description/`
2. Write `prompt.md` from `task_description` + `expected_behavior`
3. Create `repo-state/` with the minimal fixture from `repo_state_description`
4. Write `checks.py` following the pattern in `task-001-stop-verify/checks.py`:
   - Use `tempfile.TemporaryDirectory()` for isolation
   - Test the correct behavior with `subprocess.run`
   - Write failures to stderr and exit non-zero

Note: SWE-smith (`pip install swe-smith` / `swesmith generate`) is not a real tool —
this manual recipe achieves the same outcome.

**Failure log format** (write this when you observe a failure manually):

```json
{
  "observed_at": "2026-06-10T14:23:00Z",
  "task_description": "Run the stop-verify hook; assert exit code 2 on ruff violation",
  "agent_output": "Hook ran and exited with code 0 despite ruff E501 violations",
  "expected_behavior": "Exit with code 2 and surface the ruff error in stderr",
  "repo_state_description": "Python file with line > 88 chars, ruff configured in pyproject.toml",
  "affected_area": "verification",
  "tags": ["hooks", "ruff", "stop-hook"]
}
```

**Hashimoto rule application:** Every failure log you write becomes a task. The task is
added to CI. CI runs it on every future change. The agent cannot regress on that failure
without the build breaking.

---

## 6. Entropy GC

Tasks accumulate. Tasks with 100% pass rate for 10 consecutive CI runs provide diminishing
signal — the agent has fully learned that behavior, and running the task is pure cost.

**GC protocol:**

1. After every 10 CI runs, check `tests/eval-harness/results/` for tasks that passed 10/10.
2. Move those tasks to `tests/eval-harness/archive/`:
   ```bash
   mv tests/eval-harness/tasks/task-003-* tests/eval-harness/archive/
   ```
3. Remove from `baseline.json`.
4. Log the archival in `tests/eval-harness/archive/ARCHIVE-LOG.md`:
   ```
   2026-09-15 — Archived task-003-basic-commit (10/10 pass, 6 months old)
   ```

**Archive is not deletion.** If a future change regresses a capability, the archived task
can be restored. The archive log records *why* it was archived, making restoration safe.

Tasks older than **6 months** with 100% pass rate for 10 consecutive runs are eligible for
GC. Both conditions must hold; age alone is not sufficient.

---

## Running the Harness

```bash
# Run all tasks (5 runs each):
node tests/eval-harness/run-evals.js

# Run a single task (5 runs):
node tests/eval-harness/run-evals.js --task task-001-stop-verify

# Compare current results to baseline:
node tests/eval-harness/run-evals.js --compare-baseline

# Update baseline (manual, after deliberate improvement):
node tests/eval-harness/run-evals.js --update-baseline task-001-stop-verify
```

---

## Adding a New Task

1. Copy the template: `cp -r tests/eval-harness/tasks/_template tests/eval-harness/tasks/task-NNN-<name>`
2. Write `prompt.md` — exact wording the agent will receive.
3. Create `repo-state/` — minimal fixture or patch for the initial state.
4. Write `checks.py` — deterministic assertions only.
5. Fill in `metadata.json` — difficulty, area, tags.
6. Run 5 times manually: `node tests/eval-harness/run-evals.js --task task-NNN-<name>`
7. If `pass_rate >= 0.60`, record baseline: `--update-baseline task-NNN-<name>`
8. If `pass_rate < 0.60`, the task is too hard for the current agent — document why and
   decide: simplify the task, or keep it as an aspirational failing task (label `aspirational: true`
   in metadata and exclude from the CI gate until it clears 0.60).
