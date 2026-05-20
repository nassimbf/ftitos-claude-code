# SHIP Phase

Sixth phase of the sprint pipeline. Final confirmation gate, then autonomous commit, push, and deploy.

## Purpose

Execute the full ship sequence: verify all gates are clear, commit with conventional format, push to remote, update system state, and hand off to monitoring.

## Entry Criteria

- UAT approved (Gate 2 passed)
- `review_gate.can_ship = true` in manifest (hard block -- cannot proceed without this)

## What Happens

### Step 1: Pre-flight Checks

`/project:ship` verifies:
- Review gate is clear (CRITICAL findings resolved)
- All tests pass
- Coverage at or above 80%
- No hardcoded secrets in the diff

If `review_gate.can_ship` is false, SHIP is blocked:
```
SHIP BLOCKED

Review gate not cleared. Run /project:review first.

Issues:
  Code review: [passed/blocked]
  Security:    [passed/blocked]
  Aegis:       [passed/blocked]

Fix all CRITICAL issues, re-run /project:review, then re-run /project:ship.
```

A `--force` flag exists to override, but it requires documenting the risk via CARL.

### Step 2: Human Gate 3 -- Ship Confirmation

```
READY TO SHIP -- HUMAN GATE 3 OF 3

All gates clear:
  - Review gate: passed
  - Tests: passing (coverage N%)
  - UAT: approved

Type "ship" to push to production.
Type "cancel" to abort.
```

### Step 3: Pre-ship Tag

Before pushing, a git tag is created as a rollback target:
```
pre-ship-IDEA-NNN-20260418
```

If canary monitoring detects a failure post-deploy, this tag is the rollback destination.

### Step 4: Ship Execution

If the user types `ship`:

1. **Commit** -- conventional commit format (`feat:`, `fix:`, etc.)
2. **Push** -- to the remote branch
3. **Document** -- `/document-release` generates release notes
4. **Update BASE** -- project status updated in `~/.base/`
5. **Log to CARL** -- decision recorded with context
6. **Update manifest** -- sprint phase set to `done`

### Step 5: Auto-advance

After push completes, the pipeline immediately advances to MONITOR.

## Exit Criteria

- Code pushed to remote
- Release documented
- BASE and CARL state updated
- Pre-ship tag created

## What Happens Next

Auto-advances to MONITOR.

## Manifest State

```json
{
  "sprint": {
    "ship": "done"
  }
}
```
