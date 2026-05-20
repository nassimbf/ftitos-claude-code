---
name: project:status
description: Unified status dashboard across all frameworks -- BASE + PAUL + Aegis + CARL + Sprint
argument-hint: "[project-name or path]"
allowed-tools: [Read, Bash, Glob]
---

<objective>
Display a single unified status dashboard aggregating state from all four frameworks.
Shows: BASE registration, PAUL current phase, Aegis last audit, CARL decisions, sprint phase status.
Updates: reads live from each framework's state files, not from cached manifest alone.
</objective>

<process>

## Step 1: Find Project

1. If $ARGUMENTS provided: use as project name or path
2. If in a project directory: check for `.project/manifest.json` here
3. If none: look for projects in `$HOME/projects/`

## Step 2: Read All Framework States in Parallel

Read these files simultaneously:

**Manifest:**
Read `.project/manifest.json` for baseline state.

**BASE state:**
```bash
cat $HOME/.base/data/projects.json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data.get('projects', []):
    if p.get('name') == '[project-name]':
        print(json.dumps(p, indent=2))
" 2>/dev/null || echo "BASE: not registered"
```

**PAUL state:**
```bash
cat .paul/STATE.md 2>/dev/null | head -30 || echo "PAUL: not initialized"
```

**Aegis state:**
```bash
cat .aegis/STATE.md 2>/dev/null | head -20 || echo "Aegis: not initialized"
```

**CARL decisions:**
Use mcp__carl-mcp__carl_v2_search_decisions with keyword "[project-name]" to count decisions.

**Sprint phase:**
Read `.project/manifest.json` sprint object.

**Failure patterns:**
```bash
cat $HOME/.base/data/failure-patterns.json 2>/dev/null || echo "Failure analyzer: no data yet"
```

## Step 3: Compute Drift

Compare:
- BASE last_seen vs today -> days since last BASE check
- PAUL STATE.md modification date vs today -> days since last PAUL update
- Aegis last_audit in manifest vs today -> days since last security audit

Flag drift:
- 0-7 days: FRESH
- 8-14 days: DRIFTING
- 15+ days: STALE (needs groom)

## Step 4: Display Dashboard

```
============================
PROJECT STATUS: [project-name]
============================

Path:   $HOME/projects/[project-name]
Status: [active / paused / shipped]
Age:    [N days since created]

----------------------------
FRAMEWORKS
----------------------------

  BASE   [Y/N]  [status]
         Workspace: $HOME/.base/
         Last seen: [date] ([N days ago])
         Drift: [FRESH / DRIFTING / STALE]

  PAUL   [Y/N]  [status]
         Current phase: [Research / Planning / Executing / Review / QA / Shipped]
         Current milestone: [milestone name or "none"]
         Last updated: [date] ([N days ago])
         Drift: [FRESH / DRIFTING / STALE]

  Aegis  [Y/N]  [status]
         Last audit: [date or "never"]
         Findings: [N critical, N high, N medium, N low]
         Ship gate: [CLEAR / BLOCKED / WARNING / NOT AUDITED]
         Drift: [FRESH / DRIFTING / STALE]

  CARL   [Y/N]  [status]
         Decisions logged: [N]
         Last decision: [date or "none"]

----------------------------
SPRINT PIPELINE
----------------------------

  [OK] VALIDATE   [done / pending / skipped]
  [OK] PLAN       [done / pending / skipped]
  [->] BUILD      [in_progress / pending]
  [ ]  REVIEW     [pending] <- Next step
  [ ]  TEST       [pending]
  [ ]  SHIP       [pending]
  [ ]  MONITOR    [pending]

  Blocked on: [none or "review not passed" or "tests failing"]

----------------------------
REVIEW GATE
----------------------------

  Code Review:  [PASSED / BLOCKED / NOT RUN]
  Security:     [PASSED / BLOCKED / NOT RUN]
  Aegis:        [PASSED / BLOCKED / NOT RUN]
  Can Ship:     [YES / NO]

----------------------------
SYSTEM HEALTH (from /base:failure-analyzer)
----------------------------

  Read $HOME/.base/data/failure-patterns.json. If missing: "NOT RUN"
  If status == "insufficient_data": "Insufficient data -- [N]/3 sprints completed"
  If status == "analyzed":

  Data: [projects_scanned] projects, [total_checkpoints] checkpoints, [total_rollbacks] rollbacks

  Phase Failure Rates:
    BUILD:    [failure_rate * 100]%
    REVIEW:   [failure_rate * 100]%
    TEST:     [failure_rate * 100]%
    SHIP:     [failure_rate * 100]%
    MONITOR:  [failure_rate * 100]%

  Active Patterns: [summary.high_count] high, [summary.medium_count] medium

----------------------------
COMPLIANCE SCORES (from /skill-comply)
----------------------------

  Read $HOME/.base/data/compliance-scores.json. If missing: "NOT MEASURED"

  If data exists:
  Last measured: [last_measured date]
  Sprint: [sprint_id]

  GateGuard (read-before-edit):   [scores.gateguard * 100]%
  TDD (tests-before-code):       [scores.tdd * 100]%
  Security Review (on auth/API):  [scores.security_review * 100]%

  Trend (if history[] has 2+ entries): [improving / stable / declining]

----------------------------
ACTIONS NEEDED
----------------------------

  [List any STALE frameworks with action commands]
  [List any BLOCKED gates with what to fix]
  [List any HIGH-risk failure patterns with their .recommendation field]
  [List next sprint step with command]

============================
```

## Step 5: Suggest Next Action

Based on state, suggest one clear next action:

- If PAUL not initialized: "Run /project:init [name] to set up all frameworks"
- If sprint validate/plan pending: "Run /paul:plan to create implementation plan"
- If sprint build in_progress: "Continue building -- run /project:review when ready"
- If sprint build done, review pending: "Run /project:review to gate your work"
- If review blocked: "Fix CRITICAL issues listed in .aegis/findings/ and re-run /project:review"
- If review clear: "Run /project:ship to ship with full validation"
- If Aegis stale (>14 days): "Run /aegis:audit for security health check"
- If BASE drifting: "Run /base:groom to sync workspace state"

</process>

<success_criteria>
- [ ] Dashboard shows live state from all four frameworks
- [ ] Drift computed for each framework
- [ ] Sprint pipeline visually shows current position
- [ ] Review gate status clear
- [ ] Single next action suggested
- [ ] No confusing or contradictory information
</success_criteria>
