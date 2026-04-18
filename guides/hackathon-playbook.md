# Hackathon Playbook

How to use this setup to build and ship a working product in 8 hours.

This is not theory. The pipeline, agents, and TDD workflow are built for exactly this scenario: high-pressure, time-boxed, zero tolerance for broken builds.

---

## Pre-Hackathon: Install and Configure (30 min)

Do this the day before. Do not waste hackathon time on setup.

```bash
# 1. Install Claude Code if not already
npm install -g @anthropic-ai/claude-code
claude auth login

# 2. Clone and install this setup
git clone https://github.com/ftitos/ftitos-claude-code.git
cd ftitos-claude-code
./install.sh

# 3. Verify
npm run doctor

# 4. Optional: install brain servers for persistent memory
# See brain-system.md for setup instructions
```

Confirm that `/project:init test-project` works in a scratch directory. Delete the scratch directory after.

---

## Hour 0-1: Initialize and Plan

### Minute 0-10: Project Setup

```bash
mkdir ~/hackathon-project && cd ~/hackathon-project
git init
claude
```

Inside Claude Code:

```
/project:init hackathon-project
```

This creates the full project scaffolding (PAUL phases, Aegis config, CONTEXT.md).

### Minute 10-30: Validate and Plan

```
/project:sprint validate
```

While the validate phase runs, write a one-paragraph description of what you are building in `CONTEXT.md`. Be specific about:

- What the user-facing product does
- What tech stack you want to use
- What the MVP scope is (what is in, what is out)
- What APIs or services you will integrate with

When the plan appears in `.paul/PLAN.md`, review it. Cut anything that is not MVP. A hackathon plan should have 3-5 tasks, not 15.

Type `approve` to pass Gate 1.

### Minute 30-60: Architecture Decision

If your project has non-trivial architecture (API + frontend, multiple services, database schema), spend 15-20 minutes on this. Use the architect agent:

```
Ask the architect agent to review my CONTEXT.md and suggest the simplest architecture that delivers the MVP.
```

Log the decision:

```
/brain log decision: chose SQLite over Postgres for hackathon — zero config, single file, fast enough for demo scale
```

---

## Hours 2-6: Build

The build phase runs TDD automatically. Each task follows the cycle:

1. Write a failing test for the next piece of functionality
2. Write the minimum code to make it pass
3. Refactor if needed
4. Commit

### Parallel Agent Usage

For independent tasks, dispatch agents in parallel. If you have a backend API and a frontend, you can build them simultaneously:

```
Build the /api/items endpoint with tests, and in parallel build the items list component with tests.
```

Claude Code will dispatch multiple agents if the tasks have no dependencies.

### Context Budget

The 1M context window is large but not infinite. For a full-day hackathon:

- Do not paste entire log files — summarize or use subagents to analyze them
- Compact regularly — the auto-compact hook triggers at 80% usage
- Use `/brain` to offload research to the brain layer instead of keeping it in context

### Time Checkpoints

| Hour | Target | If Behind |
|------|--------|-----------|
| 2 | Core data model + 1 API endpoint working with tests | Cut scope. Pick the one feature that makes the demo work. |
| 3 | 2-3 endpoints working, basic frontend started | Drop secondary features. Focus on the happy path. |
| 4 | Frontend connected to backend, main flow works E2E | Stop adding features. Polish what you have. |
| 5 | All MVP features working with tests passing | Start review phase early. |
| 6 | Build complete, tests green, coverage at 80%+ | Force-move to review. Ship what works. |

---

## Hour 7: Review and Test

```
/project:sprint review
```

The Review Army dispatches up to 7 specialists in parallel:

1. Security specialist — auth bypass, injection, secrets
2. Performance specialist — N+1 queries, unbounded loops
3. Testing specialist — coverage gaps, flaky tests
4. Maintainability specialist — dead code, function size
5. API contract specialist — if you have endpoints
6. Design/UX specialist — if you have a frontend
7. Migration specialist — if you have database changes

Fix any CRITICAL or HIGH findings. MEDIUM findings can ship for a hackathon.

Then run the test gate:

```
/project:sprint test
```

If coverage is below 80%, add tests for uncovered paths. For a hackathon, focus tests on:

- The main user flow (happy path)
- Data validation (what happens with bad input)
- Auth checks (if applicable)

---

## Hour 8: Ship and Demo Prep

### Ship

```
/project:sprint ship
```

Review the diff. Type `approved` for Gate 2 (UAT).

Make sure your demo data is realistic — no "test@test.com" or "John Doe" in the demo (the anti-slop rules catch this, but double check).

Type `ship` for Gate 3.

### Demo Prep (Last 30 min)

Prepare a demo script with specific steps:

1. Open the app
2. Perform the main action (create, search, analyze — whatever your product does)
3. Show one thing that is technically impressive (real-time updates, smart search, data visualization)
4. Show the test suite passing (judges care about quality)

If you have Playwright set up, record a backup demo:

```
/qa record demo
```

---

## Patterns That Save Time

### 1. Start with the API, not the UI

APIs are testable, composable, and demoable with curl. UIs take longer to build and harder to test. Build the API first, prove it works, then add a frontend.

### 2. Use SQLite for Everything

Zero config. Single file. Handles thousands of concurrent reads. You can always migrate to Postgres later. For a hackathon, SQLite eliminates an entire category of problems.

### 3. Write Tests for the Happy Path First

TDD is mandatory, but in a hackathon, prioritize: test the main user flow first. Edge cases can wait. A working happy path with tests beats a comprehensive test suite with no working product.

### 4. Commit After Every Working Feature

```bash
git add -A && git commit -m "feat: add item creation endpoint with tests"
```

If something breaks badly, you can always roll back to the last working commit. Small, frequent commits are insurance.

### 5. Use /brain for Research

Instead of context-switching to a browser:

```
/brain what authentication libraries work best with Express.js and SQLite?
```

This keeps research results in your memory layer and out of your main context window.

### 6. Cut Scope Aggressively

The biggest hackathon mistake is building too much. A polished product with one feature beats a broken product with five features. If in doubt, cut it.

---

## What Not to Do

- Do not spend more than 30 minutes on architecture. Pick a boring stack and ship.
- Do not skip TDD to "move faster." Tests catch bugs that cost hours to debug manually.
- Do not build auth from scratch. Use a library or skip auth entirely for the demo.
- Do not deploy to production during the hackathon unless you have done it before with this stack. Demo locally.
- Do not ignore the review phase. A 10-minute review catches issues that take 60 minutes to debug in the demo.
