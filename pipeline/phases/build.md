# BUILD Phase

Third phase of the sprint pipeline. Fully autonomous parallel implementation with zero human input.

## Purpose

Implement the approved plan using parallel Builder agents, each working with fresh context and strict TDD discipline. Every task produces an atomic commit.

## Entry Criteria

- Gate 1 passed (user approved the plan)
- `CONTEXT.md` exists (architecture decisions locked)

## What Happens

### Step 1: Task Decomposition into Waves

Runs `/ccg:team-plan` to organize tasks into dependency waves:

- **Wave 1**: tasks with no dependencies (run in parallel)
- **Wave 2**: tasks that depend on Wave 1 output (run in parallel after Wave 1 completes)
- **Wave N**: continues until all tasks are scheduled

Each task must satisfy:
- Single responsibility
- 2 hours or less of work
- Specific file ownership (no two tasks own the same file)
- Explicit acceptance criteria
- Test requirement

### Step 2: Pheromone Routing

Before spawning Builders, `/project:pheromone-router route` dispatches any active signals from previous waves or phases. This injects warnings into Builder contexts, re-assigns tasks affected by skill gaps, and unblocks successors from completion signals.

### Step 3: Spawn Builder Agents

Runs `/ccg:team-exec`. Each Builder agent receives only:

```
CONTEXT:     full contents of CONTEXT.md (architecture lock)
LEARNINGS:   top 5 project-specific instincts (confidence > 0.5)
TASK:        full task spec with acceptance criteria
FILES:       specific file list this agent owns
CODEBASE:    only the files relevant to this task
```

No session history is passed. Each Builder gets a fresh context window. This prevents context rot and keeps agents focused.

### Step 4: TDD Execution (per Builder)

Each Builder follows the TDD cycle strictly:

1. **RED** -- write the test file first, confirm it fails
2. **GREEN** -- write the minimum implementation to pass
3. **REFACTOR** -- clean up if needed
4. **COMMIT** -- `git commit -m "feat(task-id): description"` immediately after completion

Atomic commit per task, not one big commit at the end.

### Step 5: Failure Diagnosis

If a Builder's tests fail:
1. A Diagnostic agent is spawned with: failing test output + Builder's code + CONTEXT.md
2. Diagnostic agent identifies root cause and provides a specific fix
3. Builder applies fix and retries
4. Max 3 retry attempts per task
5. After 3 failures: task is marked BLOCKED, logged to CARL, other tasks continue

### Step 6: Checkpointing

After each wave completes, a checkpoint is written to `.project/manifest.json`. Checkpoints accumulate in the `checkpoint.checkpoints` array with unique IDs. This allows the sprint to resume from the last completed wave if interrupted.

Performance history entries are also written to `~/.base/data/team.json` for each team member who completed tasks, seeding timing data for future assignment predictions.

### Step 7: Coverage Verification

After all Builders complete:

```bash
npm test -- --coverage    # or pytest --cov, cargo test, go test
```

If coverage is below 80%, targeted tests are generated autonomously for uncovered paths. This repeats until coverage meets the threshold.

## Exit Criteria

- All tasks complete (or explicitly BLOCKED)
- All tests passing
- Coverage at or above 80%

## What Happens Next

Auto-advances to REVIEW. If any tasks are BLOCKED, a summary is displayed before proceeding -- blocked items appear in the review findings.

## Manifest State

```json
{
  "sprint": {
    "validate": "done",
    "plan": "done",
    "build": "done"
  },
  "checkpoint": {
    "last_checkpoint": "CHK-1713400000",
    "checkpoints": [
      { "id": "CHK-...", "phase": "BUILD", "sub_step": "wave_1" },
      { "id": "CHK-...", "phase": "BUILD", "sub_step": "wave_2" }
    ]
  }
}
```
