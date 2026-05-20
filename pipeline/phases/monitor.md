# MONITOR Phase

Seventh and final phase of the sprint pipeline. Post-deploy verification with automatic rollback on failure.

## Purpose

Confirm the deployment is healthy through canary checks and browser smoke tests. If anything fails, roll back to the pre-ship tag automatically. If everything passes, mark the feature as LIVE and extract learnings for future sprints.

## Entry Criteria

- SHIP phase complete (code pushed to remote)

## What Happens

### Step 1: Baseline Capture

If a deployed URL exists and no baseline was captured during SHIP:
- Navigate to the deployed URL via Playwright
- Take a screenshot (saved as `pre-deploy-baseline.png`)
- Capture console state for comparison

### Step 2: Canary Health Monitoring

Runs `/canary-watch [url]` to check:
- HTTP health endpoints respond correctly
- No console errors in the browser
- No performance regressions compared to baseline
- Critical user flows complete without errors
- No 404s or broken resources

If no deployed URL exists, this step is skipped with a note in the manifest.

### Step 3: Browser QA Smoke Tests

If the project has a UI and canary passed:
- Runs `/browser-qa` against the deployed URL
- Tests critical user flows (login, main feature, data submission)
- Compares current state against pre-deploy baseline screenshots
- Logs any visual regressions or functional failures

### Step 4: Pass/Fail Decision

**If canary or browser-qa fails:**
1. Auto-rollback to the pre-ship git tag created during SHIP
2. Rollback outcome (success/failed) is recorded in `manifest.rollback.rollback_history`
3. Decision logged to CARL with rationale
4. Issue created in the project tracker

**If both pass:**
1. Completion pheromone emitted
2. Idea status updated to LIVE via `/base:idea-tracker`
3. Deployment marked stable

### Step 5: Learning Extraction

Runs `/learn-eval` to analyze the sprint and extract reusable patterns:
- What worked well (patterns to repeat)
- What failed (pitfalls to avoid)
- Saved as typed instincts with confidence scores to `~/.claude/homunculus/projects/<slug>/instincts/`
- These auto-load on next session start via the `session-start-learnings.js` hook

### Step 6: Compliance Measurement

Runs `/skill-comply` to measure whether critical rules were followed during the sprint:

| Rule | What it measures |
|------|-----------------|
| GateGuard | Were files read before being edited? |
| TDD | Were test files committed before implementation files? |
| Security review | Was security review triggered on auth/API changes? |

Results are stored in `~/.base/data/compliance-scores.json` and appended to the history array for trend tracking. Scores are displayed by `/project:status`.

### Step 7: Failure Pattern Analysis

Runs `/base:failure-analyzer` to update cross-sprint pattern data. Requires 3 or more completed sprints to produce findings. Identifies recurring failure modes (specific file types that consistently break, phases that frequently produce CRITICAL findings, etc.).

## Exit Criteria

- Canary checks pass (or rollback completed)
- Learnings extracted
- Compliance measured
- Sprint marked complete in manifest

## What Happens Next

Sprint is complete. The pipeline is idle until the next `/project:sprint validate`.

## Manifest State

```json
{
  "sprint": {
    "validate": "done",
    "plan": "done",
    "build": "done",
    "review": "done",
    "test": "done",
    "ship": "done",
    "monitor": "done"
  },
  "rollback": {
    "last_rollback": null,
    "rollback_history": []
  }
}
```
