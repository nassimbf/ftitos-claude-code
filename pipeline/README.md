# Sprint Pipeline

The sprint pipeline is a 7-phase development workflow that takes a feature from idea to production with exactly 3 human checkpoints. Everything between those checkpoints runs autonomously -- research, planning validation, code review, security scanning, and post-deploy monitoring all happen without manual intervention.

## Phases

```
VALIDATE → PLAN → [Gate 1] → BUILD → REVIEW → TEST → [Gate 2] → SHIP → [Gate 3] → MONITOR
```

| Phase | What happens | Human input required? |
|-------|-------------|----------------------|
| VALIDATE | Product logic analysis, market research, competitor scan, stack recommendation, risk assessment | No |
| PLAN | Implementation plan, architecture decisions, task decomposition, team assignment | **Gate 1**: approve the plan |
| BUILD | Parallel TDD implementation with fresh-context agents, atomic commits per task | No |
| REVIEW | 7-specialist code review, security scan, Aegis audit, OWASP/STRIDE analysis | No |
| TEST | Structural verification, browser QA, coverage checks | **Gate 2**: perform UAT, type "approved" |
| SHIP | Final checks, commit, push, deploy | **Gate 3**: type "ship" to push |
| MONITOR | Canary health checks, browser smoke tests, auto-rollback on failure | No |

## The 3 Human Gates

**Gate 1 -- Plan Approval** (after PLAN, before BUILD)
Review the generated plan, locked architecture decisions, and task assignments. Type `approve` to start autonomous building. Or describe changes -- the plan gets revised and re-validated.

**Gate 2 -- UAT** (after TEST, before SHIP)
All automated checks have passed. Test the product yourself. Type `approved` to proceed. Or describe issues -- they get fixed and TEST re-runs.

**Gate 3 -- Ship Confirmation** (during SHIP)
Review gate passed, tests green, UAT approved. Type `ship` to push to production. Type `cancel` to hold.

Everything between these gates runs without asking for input. The system chains phases automatically -- BUILD finishing triggers REVIEW, REVIEW clearing triggers TEST, and so on.

## Starting a Sprint

```
/project:sprint validate
```

This enters the VALIDATE phase. From there, each phase auto-advances to the next when its exit criteria are met (except at human gates, where the pipeline pauses and waits).

## Checking Status

```
/project:sprint status
```

Shows which phase is active, what exit criteria remain, and whether any gates are blocking.

## Advancing Manually

```
/project:sprint next       # auto-detect and advance to next phase
/project:sprint build      # jump to a specific phase (gate checks still apply)
```

The `ship` phase is hard-gated -- it will not proceed unless the review gate is clear. All other transitions issue warnings but do not hard-block.

## Framework Involvement

Each phase uses specific frameworks from the stack:

| Phase | Frameworks / Tools |
|-------|--------------------|
| VALIDATE | /product-lens, 4 parallel research agents |
| PLAN | PAUL (/paul:plan), Plan Validator agent, CONTEXT.md creation |
| BUILD | CCG (/ccg:team-plan, /ccg:team-exec), parallel Builder agents |
| REVIEW | Review Army (7 specialists), Santa Method council, Aegis, OWASP/STRIDE |
| TEST | CCG (/ccg:verify-module), Playwright (/browser-qa) |
| SHIP | /project:ship, CARL decision logging, BASE state update |
| MONITOR | /canary-watch, /browser-qa, CARL, /learn-eval |

## State Tracking

Sprint state lives in `.project/manifest.json` under the `sprint` key. Each phase is tracked as `pending`, `in_progress`, or `done`. The manifest also holds the review gate status, checkpoint history, and rollback records.

## Phase Documentation

Detailed documentation for each phase is in the [phases/](phases/) directory:

- [VALIDATE](phases/validate.md) -- idea validation and research
- [PLAN](phases/plan.md) -- implementation planning and Gate 1
- [BUILD](phases/build.md) -- parallel TDD implementation
- [REVIEW](phases/review.md) -- multi-specialist code review
- [TEST](phases/test.md) -- verification and Gate 2
- [SHIP](phases/ship.md) -- deployment and Gate 3
- [MONITOR](phases/monitor.md) -- post-deploy health checks
