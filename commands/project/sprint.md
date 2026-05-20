---
name: project:sprint
description: Advance the sprint phase with guidance and gating -- VALIDATE -> PLAN -> BUILD -> REVIEW -> TEST -> SHIP -> MONITOR
argument-hint: "<phase> | status | next"
allowed-tools: [Read, Write, Edit, Bash, AskUserQuestion]
---

<objective>
Manage sprint phase transitions. Advances the phase in .project/manifest.json, provides
phase-specific guidance, and enforces gates (can't skip REVIEW before SHIP).

Usage:
  /project:sprint validate    -> Start VALIDATE phase
  /project:sprint plan        -> Start PLAN phase (requires validate done)
  /project:sprint build       -> Start BUILD phase (requires plan done)
  /project:sprint review      -> Start REVIEW phase (triggers /project:review)
  /project:sprint test        -> Start TEST phase
  /project:sprint ship        -> Start SHIP phase (triggers /project:ship gate check)
  /project:sprint monitor     -> Start MONITOR phase
  /project:sprint status      -> Show current phase status
  /project:sprint next        -> Automatically advance to next phase
</objective>

<phase_definitions>

## Phase: VALIDATE

**Purpose:** Multi-dimensional idea validation -- product logic + market + competitors + stack + risks.
**Tools:** /product-lens + 4 parallel research agents

**Entry criteria:** None (always allowed)
**Exit criteria:** PRODUCT-BRIEF.md + RESEARCH.md exist with go/no-go

**Execution (autonomous -- no human input after you describe the idea):**

1. Run /product-lens for product logic: MVP definition, anti-goals, success metric, go/no-go.

2. Immediately after, spawn 4 parallel research agents (use Agent tool, all at once):

   **Agent 1 -- Market Research:**
   Research market size, growth rate, target customer segments, willingness to pay, distribution channels.
   Output: RESEARCH-market.md

   **Agent 2 -- Competitor Analysis:**
   Identify direct and indirect competitors. For each: features, pricing, weaknesses, moat.
   Output: RESEARCH-competitors.md

   **Agent 3 -- Stack Recommendation:**
   Based on the product brief, recommend the specific tech stack. Justify each choice.
   Identify relevant open-source libraries and frameworks to avoid building from scratch.
   Output: RESEARCH-stack.md

   **Agent 4 -- Risk & Pitfalls:**
   Technical risks, market risks, regulatory risks, known failure modes for this type of product.
   Output: RESEARCH-risks.md

3. Synthesize all 5 sources into:
   - `PRODUCT-BRIEF.md` -- go/no-go, MVP, anti-goals, success metric
   - `RESEARCH.md` -- combined market + competitor + stack + risks summary

**Auto-advance to PLAN when complete.**

**When complete, advance to:** PLAN

---

## Phase: PLAN

**Purpose:** Create, validate, and lock the implementation plan. Ends at Human Gate 1.
**Tools:** /paul:plan -> Plan Validator agent -> CONTEXT.md creation

**Entry criteria:** validate = done
**Exit criteria:** PAUL plan exists + PLAN-REVIEW.md + CONTEXT.md + human typed "approve"

**Execution:**

1. Run /paul:plan with the PRODUCT-BRIEF.md and RESEARCH.md as input context.
   Output: phased plan with wave-grouped tasks, each task <= 2 hours, with clear acceptance criteria.

2. Spawn **Plan Validator agent** to audit the plan:
   - Every task has: clear exit criteria, defined file ownership, test requirement
   - No task is too vague (flag with suggested clarification)
   - No task is too large (>2 hours of work -- split it)
   - No missing coverage: auth, error handling, edge cases, security, data validation
   - Dependency order is correct (no circular deps)
   - Output: PLAN-REVIEW.md listing issues + suggested fixes

3. Auto-apply obvious validator fixes (rename vague tasks, split oversized tasks).
   Flag complex issues in PLAN-REVIEW.md for human review.

4. Create **CONTEXT.md** -- the architectural decision lock file:
   Extract from the plan all: technology choices, data models, API contracts, auth approach, DB schema, key architectural patterns.
   Format as explicit decisions: "Decision: Use PostgreSQL. Reason: relational data with joins. NOT revisable during BUILD."
   This file is READ-ONLY during BUILD. No agent may contradict it.

4.5. **Auto-assign tasks to team members (if team.json exists):**
   1. Run /ccg:task-decomposition to generate `.project/task-graph.json`
   2. Run /base:team-matrix analyze --tasks-file .project/task-graph.json
   3. Run /base:team-matrix assign --confirm (commits assignments to manifest)
   4. If in a project context: run /base:idea-tracker status IDEA-NNN --assignees [list]
   Output: `manifest.assignments` block populated with task -> member mappings

5. **HUMAN GATE 1 -- Plan Approval. STOP.**
   ```
   ============================
   PLAN READY -- HUMAN GATE 1 OF 3
   ============================

   Review before autonomous execution begins:
     -> .paul/PLAN.md       -- full phased plan
     -> CONTEXT.md          -- locked architecture decisions
     -> PLAN-REVIEW.md      -- validator findings
     -> .project/task-graph.json -- parallelization breakdown

   Type "approve" to begin autonomous BUILD.
   Or describe changes -- plan will be revised and re-validated.

   ============================
   ```

   **Handling user feedback:**
   - If reassignment: update manifest.assignments map, re-display Gate 1
   - If plan changes: revise .paul/PLAN.md, re-run validators + task decomposition + assignments, re-present Gate 1
   - If "apply calibration": run `/base:velocity-calibrate apply`, re-run team-matrix with new weights, re-display Gate 1
   - If "approve": immediately auto-advance to BUILD.

   Wait for human response "approve" to proceed.

**When complete, advance to:** BUILD

---

## Phase: BUILD

**Purpose:** Fully autonomous parallel implementation. Zero human input until BUILD is complete.
**Tools:** /ccg:team-plan -> /ccg:team-exec (parallel Builder agents with fresh context)

**Entry criteria:** plan approved (Gate 1 passed), CONTEXT.md exists
**Exit criteria:** all tasks complete, 80%+ coverage, all tests passing -> REVIEW auto-triggered

**Execution (fully autonomous):**

### Step 1: Generate atomic task list

Run /ccg:team-plan with the PAUL plan as input.
Each generated task MUST satisfy:
- Single responsibility (one clear thing to build)
- <= 2 hours of work
- Specific file ownership (no two tasks own the same file)
- Explicit acceptance criteria
- Test requirement (test written BEFORE implementation)

Organize tasks into dependency waves:
- Wave 1: tasks with no dependencies (run in parallel)
- Wave 2: tasks that depend on Wave 1 output (run in parallel after Wave 1)
- etc.

### Step 2: Spawn Builder agents (fresh context per agent)

Run /ccg:team-exec. Each Builder agent receives ONLY:
```
CONTEXT: [full contents of CONTEXT.md]
TASK: [full task spec including acceptance criteria]
FILES YOU OWN: [specific file list]
CODEBASE EXCERPT: [only the files relevant to this task]
```

**Critical**: NO session history is passed to Builders. Fresh context window per agent.
This prevents context rot -- each Builder works with clean, focused context.

Each Builder MUST:
1. Write the test file FIRST (RED -- confirm it fails before writing implementation)
2. Write minimal implementation to pass the test (GREEN)
3. Refactor if needed (IMPROVE)
4. Run its tests -- confirm passing
5. On completion: `git add [owned files] && git commit -m "feat([task-id]): [task description]"`
   **Atomic commit per task -- immediately after task completes, not at end.**

### Step 3: Failure diagnosis loop

If a Builder's tests fail:
1. Spawn **Diagnostic agent** with: failing test output + Builder's code + CONTEXT.md
2. Diagnostic agent identifies root cause, provides specific fix
3. Builder applies fix and retries
4. Max 3 retry attempts per task
5. If still failing after 3 attempts: mark task BLOCKED, log to CARL, continue other tasks
6. Blocked tasks surface in final summary -- human resolves after BUILD, before REVIEW

### Step 4: Coverage verification

After all Builders complete:
```bash
# Run full test suite
npm test -- --coverage 2>&1 | tail -20
# or: pytest --cov=. --cov-report=term-missing 2>&1 | tail -20
# or: cargo test 2>&1 | tail -20
```

If coverage < 80%: identify uncovered paths, generate targeted tests autonomously, add them.
Re-run until coverage >= 80%.

### Step 5: Auto-advance to REVIEW

When all tasks are complete (or BLOCKED) and coverage >= 80%:
**Immediately execute /project:sprint review -- no human input needed.**

If any tasks BLOCKED: display summary before proceeding:
```
Warning: BUILD completed with blocked tasks:
  [task-id]: [reason]
Proceeding to REVIEW -- blocked items will appear in review findings.
```

**When complete, advance to:** REVIEW (automatically)

---

## Phase: REVIEW

**Purpose:** 5-layer automated quality + security gate. Fully autonomous.
**Tool:** /project:review (code-review + security + Aegis + OWASP/STRIDE)

**Entry criteria:** build = done (tests passing, coverage >= 80%)
**Exit criteria:** review_gate.can_ship = true in manifest -> TEST auto-triggered

**Execution (autonomous):**

1. Run /project:review (full 5-layer pipeline).

2. If CRITICAL findings:
   - Autonomous fix attempt: spawn Fix agent with the finding + relevant code
   - Fix agent applies minimal surgical fix
   - Re-run /project:review on the affected files only
   - If fix resolves it: continue. If not: log to CARL, mark as BLOCKED, continue review.

3. HIGH findings: log to CARL automatically, do NOT block.

4. When review_gate.can_ship = true: **immediately auto-advance to TEST.**

5. If review_gate blocked after fix attempts: surface to human with specific file:line references.
   Human resolves, then system resumes autonomously.

**When complete, advance to:** TEST (automatically)

---

## Phase: TEST

**Purpose:** Automated structural + browser QA, then Human Gate 2 (UAT).
**Tools:** /ccg:verify-module + /browser-qa (if UI) -> Human Gate 2

**Entry criteria:** review gate clear
**Exit criteria:** human typed "approved" at Gate 2

**Execution:**

1. Run /ccg:verify-module -- check structure completeness (exports, tests, docs).

2. If project has a UI: run /browser-qa for real-browser Playwright testing.
   - Walks critical user flows, detects console errors, verifies renders
   - If no URL/UI: skip with note in manifest

3. Fix structural or browser issues found autonomously. Re-run affected checks.

4. **HUMAN GATE 2 -- UAT. STOP.**
   ```
   ============================
   READY FOR UAT -- HUMAN GATE 2 OF 3
   ============================

   Automated checks: PASSED
     OK /ccg:verify-module
     OK /browser-qa (or: skipped -- no UI)
     OK Coverage: N%

   Your turn: test the product yourself.
   [URL if available]

   Type "approved" to proceed to SHIP.
   Or describe issues -- system will fix and re-run TEST.

   ============================
   ```

5. If issues described: spawn Fix agent, apply fixes, re-run TEST, return to Gate 2.
   If "approved": **immediately auto-advance to SHIP.**

**When complete, advance to:** SHIP (automatically after Gate 2 approval)

---

## Phase: SHIP

**Purpose:** Final confirmation then autonomous deploy pipeline.
**Tool:** /project:ship

**Entry criteria:** UAT approved (Gate 2 passed)
**Exit criteria:** Pushed to remote, docs synced, CARL logged -> MONITOR auto-triggered

**HUMAN GATE 3 -- Ship Confirmation. STOP.**
```
============================
READY TO SHIP -- HUMAN GATE 3 OF 3
============================

All gates clear:
  OK Review gate: passed
  OK Tests: passing (coverage N%)
  OK UAT: approved

Type "ship" to push to production.
Type "cancel" to abort.

============================
```

If "ship": run /project:ship autonomously (commit + push + /document-release + CARL log).
If "cancel": hold at this gate until next session.

After push: **immediately auto-advance to MONITOR.**

**When complete, advance to:** MONITOR (automatically)

---

## Phase: MONITOR

**Purpose:** Post-deploy health check with real-browser monitoring.
**Tool:** /canary-watch

**Entry criteria:** ship = done
**Exit criteria:** Deployment confirmed healthy, no regressions

**What to do in this phase:**

### Step 1: Pre-ship baseline (if not already captured in SHIP phase)
If a deployed URL exists and no baseline screenshots were captured:
```
Use Playwright MCP to capture baseline state:
- mcp__playwright__browser_navigate to the deployed URL
- mcp__playwright__browser_take_screenshot (save as pre-deploy-baseline.png)
- mcp__playwright__browser_console_messages (save console state)
```

### Step 2: Canary health monitoring
If deployed to a URL: run /canary-watch [url]
- Produces a health report with pass/fail per check
- Watch for: console errors, performance regressions, broken user flows, 404s
If no URL: skip with note in manifest

### Step 3: Browser QA smoke tests
If project has a UI and canary passed:
- Run /browser-qa against the deployed URL
- Test critical user flows (login, main feature, data submission)
- Compare against pre-deploy baseline screenshots
- If issues found: log to CARL, create issue in project tracker

### Step 4: Auto-rollback or LIVE decision
- If canary OR browser-qa fails -> auto-trigger rollback
- If both pass -> emit completion pheromone + update idea status to LIVE

4. If regression found: log to CARL and create issue in project tracker

---

</phase_definitions>

<process>

## Step 1: Parse Arguments

- If `status` or no arg: show current phase status (same as /project:status sprint section)
- If `next`: automatically determine next phase and advance to it
- If phase name: advance to that specific phase

## Step 2: Read Current Sprint State

Read `.project/manifest.json` sprint object.
Read `.paul/STATE.md` for PAUL phase alignment.

## Step 3: Validate Phase Transition

Check phase gates:
- `plan` requires `validate = done` (warning only, not hard block)
- `build` requires `plan = done` (warning only)
- `review` requires `build = done` (warning only)
- `ship` requires `review_gate.can_ship = true` (HARD BLOCK)
- `monitor` requires `ship = done` (warning only)

## Step 4: Execute Phase Entry Actions

**If advancing to REVIEW:**
```
Entering REVIEW phase. Running /project:review...
```
Then follow the project:review process.

**If advancing to SHIP:**
Check review gate. If not clear:
```
Cannot enter SHIP phase -- review gate not cleared.
Run /project:review first and fix all CRITICAL issues.
```

**If advancing to any other phase:**
Show phase guidance (what to do, what tools to use, exit criteria).

## Step 5: Update Manifest

Update `.project/manifest.json`:
- Set `sprint.[phase]` to `in_progress`
- Set `sprint.last_updated` to current timestamp

If previous phase was `in_progress`, mark it `done`.

## Step 6: Display Phase Entry Summary

```
============================
ENTERING PHASE: [PHASE NAME]
============================

Project: [name]
Previous phase: [name] (done)
Current phase: [name] (in_progress)

Goal: [phase purpose]
Tools: [relevant commands]

Exit criteria:
  [ ] [criterion 1]
  [ ] [criterion 2]

When done, run: /project:sprint next
============================
```

</process>

<success_criteria>
- [ ] Phase transition validated against gates
- [ ] Manifest sprint state updated
- [ ] Phase entry actions triggered (review auto-runs on REVIEW phase)
- [ ] Clear guidance displayed for what to do in the phase
- [ ] SHIP gate enforced (cannot advance without clear review)
</success_criteria>
