---
name: project:ship
description: Ship with full validation -- review gate check + tests + commit + BASE state update + CARL log
argument-hint: "[--force] [--message 'commit message']"
allowed-tools: [Read, Write, Edit, Bash, Glob, AskUserQuestion]
---

<objective>
Execute the full ship pipeline:
1. Verify review gate is clear (blocks if /project:review not passed)
2. Run final tests
3. Verify 80% coverage minimum
4. Commit with conventional format
5. Push to remote
6. Update BASE project status
7. Update sprint manifest to "shipped"
8. Log CARL decision
9. Initialize canary watch (if URL known)

This replaces running tests, git commit, git push, and state updates separately.
</objective>

<process>

## Step 1: Read Project Context

Read `.project/manifest.json`:
- Check `review_gate.can_ship` -- must be true
- Check `sprint.ship` -- must not already be "done"
- Get project name and description

If manifest not found: warn but continue (no gate enforcement without manifest).

## Step 2: Enforce Review Gate

If `review_gate.can_ship` is false:
```
SHIP BLOCKED

Review gate not cleared. Run /project:review first.

Issues:
  Code review: [passed/blocked]
  Security:    [passed/blocked]
  Aegis:       [passed/blocked]

Fix all CRITICAL issues, re-run /project:review, then re-run /project:ship.
```
STOP execution unless --force flag was provided.

If --force: warn strongly but continue:
```
OVERRIDE: Shipping without clean review gate.
Document risk with: /carl_log_decision "override-ship" "Shipped without clean review" "[reason]"
```

## Step 3: Verify Test Coverage

Check if test framework is configured:
```bash
# Detect test setup
ls package.json 2>/dev/null && cat package.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('scripts',{}).get('test','no-test-script'))" 2>/dev/null
ls pytest.ini pyproject.toml setup.cfg 2>/dev/null
ls Cargo.toml 2>/dev/null
```

Run tests based on detected framework:
```bash
# Node.js
npm test 2>&1 | tail -20

# Python
python -m pytest --tb=short 2>&1 | tail -20

# Rust
cargo test 2>&1 | tail -20

# Go
go test ./... 2>&1 | tail -20
```

If tests fail:
```
SHIP BLOCKED -- Tests failing.
Fix failing tests before shipping.
```
STOP execution.

Check coverage (if available):
- Node.js: look for coverage report in coverage/ or lcov output
- Python: pytest-cov output
- If coverage < 80%: WARN (don't block, but require CARL log)

## Step 4: Final Security Check

Quick check for secrets in staged files:
```bash
git diff --staged --name-only 2>/dev/null | xargs -I{} grep -l -E "(API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY)\s*=\s*['\"][^'\"]+['\"]" {} 2>/dev/null || echo "no-secrets-found"
```

If secrets found:
```
SHIP BLOCKED -- Potential secrets detected in staged files.
```
STOP execution, DO NOT proceed.

## Step 5: Commit

Show diff summary:
```bash
git diff --staged --stat 2>/dev/null || git diff --stat HEAD 2>/dev/null
```

If no changes staged, stage all (with confirmation):
```
No staged changes found. Stage all changes? (y/n)
```

Determine commit type from changes:
- New files, new features -> feat:
- Bug fixes -> fix:
- Refactoring without behavior change -> refactor:
- Tests -> test:
- Documentation -> docs:
- Config/tooling -> chore:

Format commit message:
```
[type]: [description]

[optional body with what changed and why]

[optional: Closes #issue-number]
```

If --message provided: use it directly.
If not: derive from changes or ask.

Commit:
```bash
git commit -m "[message]"
```

## Step 6: Push

Check remote:
```bash
git remote -v 2>/dev/null | head -3
```

Push:
```bash
git push 2>&1
```

If push fails (new branch):
```bash
git push --set-upstream origin $(git branch --show-current) 2>&1
```

If push fails (conflict):
```
Push failed -- remote has changes. Pull and merge first.
```

## Step 7: Update BASE Status

Update project status in workspace:
```bash
# Update .base/data/projects.json if it exists
# Change project status from "active" to "shipped" or "completed"
```

Read `.base/data/projects.json`, find the project by name, update its status field to "shipped" and add timestamp.

## Step 8: Update Sprint Manifest

Update `.project/manifest.json`:
```json
{
  "sprint": {
    "ship": "done",
    "monitor": "pending",
    "last_updated": "[ISO timestamp]"
  },
  "status": "shipped"
}
```

## Step 8.5: Run /document-release (if docs exist)

After push succeeds, synchronize documentation with the shipped state:

Check if any docs exist:
```bash
ls docs/ README.md CHANGELOG.md 2>/dev/null | head -5
```

If docs exist: run /document-release
- /document-release updates CHANGELOG.md, README badges, and any versioned docs to reflect the shipped commit
- Skip if no docs directory and no README

If skipped: note in ship summary "docs: skipped (none found)"

## Step 9: Log CARL Decision

Log the ship event to CARL:
Use mcp__carl-mcp__carl_v2_log_decision with:
- domain: "ship"
- decision: "Shipped [project-name] -- commit [short-sha]"
- rationale: "Review gate: [passed/override]. Tests: [passed]. Coverage: [N]%."
- recall: "ship, [project-name], [short-sha], deploy"

Update manifest `frameworks.carl.decisions_logged` counter.

## Step 10: Display Ship Summary

```
============================
SHIPPED: [project-name]
============================

Commit:  [short-sha] [commit message]
Branch:  [branch-name]
Remote:  [push URL]

Validation:
  OK Review gate: cleared
  OK Tests: passed
  OK Coverage: [N]%
  OK No secrets in staged files

State Updated:
  OK BASE: project status -> shipped
  OK Manifest: sprint.ship -> done
  OK CARL: decision logged ([decision-id])

Next:
  Monitor: Run /canary [url] or /canary-watch [url] if deployed to URL
  Update:  Run /base:status to see workspace summary
  Reflect: Run /retro if end of sprint

============================
```

</process>

<success_criteria>
- [ ] Review gate verified before shipping
- [ ] Tests pass
- [ ] No secrets in staged files
- [ ] Commit created with conventional format
- [ ] Pushed to remote
- [ ] /document-release run (or skipped with noted reason)
- [ ] BASE project status updated to "shipped"
- [ ] Sprint manifest updated
- [ ] CARL decision logged with commit SHA
- [ ] Summary displayed
</success_criteria>
