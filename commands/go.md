---
name: go
description: CEO single-command entry point — chains the full sprint pipeline with 3 human gates
argument-hint: '"<feature description>"'
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, AskUserQuestion]
---

<objective>
Single entry point for the CEO workflow. Takes a feature description, chains through
the entire sprint pipeline autonomously, stopping only at the 3 human gates.

Usage:
  /go "Build password reset flow with email verification"
  /go "Add DATEV CSV export for booking transactions"
  /go "Implement audit trail logging for all API mutations"

The CEO never needs to remember which /project:sprint phase to run.
Everything chains automatically. 3 human touches total.
</objective>

<process>

## Step 0: Verify Project Context

Check if `.project/manifest.json` exists in the current directory.
If not: error — run `/project:init <name>` first.

Read manifest to get project name and current sprint state.

## Step 1: Capture Feature Description

Extract the feature description from $ARGUMENTS.
If empty, use AskUserQuestion: "What feature do you want to build?"

Store as `FEATURE_DESC`.

## Step 2: VALIDATE (autonomous)

Run the VALIDATE phase from `/project:sprint validate`:

1. Run /product-lens with `FEATURE_DESC` for product logic validation
2. Spawn 4 parallel research agents:
   - Market Research
   - Competitor Analysis
   - Stack Recommendation
   - Risk & Pitfalls
3. Synthesize into PRODUCT-BRIEF.md + RESEARCH.md

Auto-advance when complete.

## Step 3: SPECIFY (autonomous)

Generate `spec.md` with numbered user stories:

1. Read PRODUCT-BRIEF.md and RESEARCH.md
2. Decompose `FEATURE_DESC` into user stories tagged `[US1]`, `[US2]`, etc.
3. Each story follows: "As a [role], I want [action], so that [benefit]"
4. Each story has acceptance criteria
5. Write `spec.md` to project root

Format:
```markdown
# Specification — [Feature Name]

## User Stories

### [US1] [Story Title]
As a [role], I want [action], so that [benefit].

**Acceptance Criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]

### [US2] [Story Title]
...
```

Auto-advance when complete.

## Step 4: PLAN (autonomous)

Run the PLAN phase:

1. Run /paul:plan with PRODUCT-BRIEF.md, RESEARCH.md, and spec.md as input
2. Spawn Plan Validator agent to audit the plan
3. Auto-apply obvious fixes
4. Create CONTEXT.md (architectural decision lock)

Auto-advance when complete.

## Step 5: Constitution Check (autonomous)

If `.project/constitution.md` exists:
1. Run `/project:constitution check`
2. If VIOLATION found: attempt auto-fix, re-check
3. If still blocked: surface to user with specific violation

If constitution does not exist: skip with note.

## Step 6: ANALYZE (autonomous)

Run `/project:analyze`:
1. Cross-check spec.md stories vs plan tasks vs constitution
2. Generate ANALYSIS-REPORT.md
3. If CRITICAL findings: attempt auto-fix where safe

## Step 7: GATE 1 — Plan Approval

```
════════════════════════════════════════
GATE 1 OF 3 — PLAN APPROVAL
════════════════════════════════════════

Feature: [FEATURE_DESC]

Review these artifacts:
  spec.md              — [N] user stories
  .paul/PLAN.md        — phased implementation plan
  CONTEXT.md           — locked architectural decisions
  ANALYSIS-REPORT.md   — consistency check results
  constitution check   — [PASS/FAIL]

Type "approve" to begin autonomous BUILD.
Or describe changes — plan will be revised.

════════════════════════════════════════
```

Wait for "approve". If changes requested: revise and re-validate.

## Step 8: BUILD (autonomous)

On "approve", run BUILD phase:

1. Generate atomic task list with dependency waves
2. Tasks tagged `[P]` dispatched to parallel Builder agents
3. Each Builder gets fresh context (CONTEXT.md + task only)
4. TDD enforced: test first, then implement
5. Atomic commit per task
6. Coverage verification (80%+ required)

Auto-advance when all tasks complete.

## Step 9: REVIEW (autonomous)

Run `/project:review` — 7 specialist review army:
1. Security Specialist
2. Performance Specialist
3. Data Migration Specialist (if applicable)
4. API Contract Specialist (if applicable)
5. Testing Specialist
6. Maintainability Specialist
7. Design/UX Specialist (if applicable)

CRITICAL findings → Council (2 independent reviewers).
Auto-fix where safe. Log to CARL.

## Step 10: TEST (autonomous)

1. Run /ccg:verify-module for structure checks
2. Run /browser-qa if project has UI
3. Fix issues found

## Step 11: GATE 2 — UAT

```
════════════════════════════════════════
GATE 2 OF 3 — USER ACCEPTANCE TESTING
════════════════════════════════════════

Feature: [FEATURE_DESC]

Automated checks: PASSED
  Coverage: [N]%
  Review gate: cleared
  Structure: verified

Your turn: test the product yourself.
[URL if available]

Type "approved" to proceed to SHIP.
Or describe issues — system will fix and re-test.

════════════════════════════════════════
```

Wait for "approved". If issues: fix and re-test.

## Step 12: GATE 3 — Ship

```
════════════════════════════════════════
GATE 3 OF 3 — SHIP CONFIRMATION
════════════════════════════════════════

Feature: [FEATURE_DESC]
All gates clear.

Type "ship" to push to production.
Type "cancel" to hold.

════════════════════════════════════════
```

On "ship": run /project:ship (commit + push + docs + CARL log).
Then auto-advance to MONITOR.

## Step 13: MONITOR (autonomous)

1. Run /canary-watch if deployed URL exists
2. Run /browser-qa smoke tests
3. Extract learnings via /learn-eval
4. Measure compliance via /skill-comply

```
════════════════════════════════════════
FEATURE COMPLETE: [FEATURE_DESC]
════════════════════════════════════════

Pipeline: VALIDATE > SPECIFY > PLAN > ANALYZE > BUILD > REVIEW > TEST > SHIP > MONITOR
Duration: [time from start to finish]
Commits: [N] atomic commits
Coverage: [N]%
Findings resolved: [N]

Status: LIVE

════════════════════════════════════════
```

</process>

<success_criteria>
- [ ] Feature description captured
- [ ] VALIDATE produced PRODUCT-BRIEF.md + RESEARCH.md
- [ ] SPECIFY produced spec.md with numbered user stories
- [ ] PLAN produced .paul/PLAN.md + CONTEXT.md
- [ ] Constitution check passed (or violations resolved)
- [ ] ANALYZE produced ANALYSIS-REPORT.md (zero CRITICALs)
- [ ] Gate 1 approved by human
- [ ] BUILD completed with 80%+ coverage
- [ ] REVIEW cleared by 7 specialists
- [ ] Gate 2 approved by human (UAT)
- [ ] Gate 3 confirmed by human (ship)
- [ ] MONITOR completed post-deploy checks
</success_criteria>
