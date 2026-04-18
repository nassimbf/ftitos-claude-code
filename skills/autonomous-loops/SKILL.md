---
name: autonomous-loops
description: Patterns and architectures for autonomous Claude Code loops -- from simple sequential pipelines to RFC-driven multi-agent DAG systems.
origin: ECC
---

# Autonomous Loops Skill

Patterns, architectures, and reference implementations for running Claude Code autonomously in loops.

## When to Use

- Setting up autonomous development workflows
- Choosing the right loop architecture for your problem
- Building CI/CD-style continuous development pipelines
- Running parallel agents with merge coordination
- Implementing context persistence across loop iterations

## Loop Pattern Spectrum

| Pattern | Complexity | Best For |
|---------|-----------|----------|
| Sequential Pipeline | Low | Daily dev steps, scripted workflows |
| Infinite Agentic Loop | Medium | Parallel content generation, spec-driven work |
| Continuous PR Loop | Medium | Multi-day iterative projects with CI gates |
| De-Sloppify Pattern | Add-on | Quality cleanup after any Implementer step |
| RFC-Driven DAG | High | Large features, multi-unit parallel work |

---

## 1. Sequential Pipeline (`claude -p`)

Break daily development into a sequence of non-interactive `claude -p` calls:

```bash
#!/bin/bash
set -e

# Step 1: Implement the feature
claude -p "Read the spec. Implement the feature with TDD."

# Step 2: Cleanup pass
claude -p "Review changes. Remove unnecessary checks, test slop, debug statements."

# Step 3: Verify
claude -p "Run build + lint + tests. Fix any failures."

# Step 4: Commit
claude -p "Create a conventional commit for all staged changes."
```

### Key Principles
1. **Each step is isolated** -- Fresh context per call
2. **Order matters** -- Each builds on filesystem state from the previous
3. **Exit codes propagate** -- `set -e` stops the pipeline on failure

### Model Routing
```bash
claude -p --model opus "Analyze architecture and write plan..."
claude -p "Implement according to plan..."
claude -p --model opus "Review all changes for security issues..."
```

---

## 2. Infinite Agentic Loop

A two-prompt system that orchestrates parallel sub-agents for specification-driven generation:

1. **Spec Analysis** -- Orchestrator reads a specification file
2. **Directory Recon** -- Scans existing output to find highest iteration number
3. **Parallel Deployment** -- Launches N sub-agents with unique creative directions
4. **Wave Management** -- For infinite mode, deploys waves of 3-5 agents

### Key Insight: Uniqueness via Assignment
Don't rely on agents to self-differentiate. The orchestrator **assigns** each agent a specific creative direction and iteration number.

---

## 3. Continuous PR Loop

A shell script that runs Claude Code in a continuous loop, creating PRs, waiting for CI, and merging automatically:

```
1. Create branch (continuous-claude/iteration-N)
2. Run claude -p with enhanced prompt
3. (Optional) Reviewer pass
4. Commit changes
5. Push + create PR
6. Wait for CI checks
7. CI failure? -> Auto-fix pass
8. Merge PR
9. Return to main -> repeat
```

### Cross-Iteration Context
A `SHARED_TASK_NOTES.md` file persists across iterations, bridging the context gap between independent `claude -p` invocations.

### Completion Signal
Claude can signal "I'm done" by outputting a magic phrase. Three consecutive iterations signaling completion stops the loop.

---

## 4. The De-Sloppify Pattern

An add-on for any loop. Add a dedicated cleanup step after each Implementer step:

```bash
# Step 1: Implement (let it be thorough)
claude -p "Implement the feature with full TDD."

# Step 2: De-sloppify (separate context, focused cleanup)
claude -p "Review all changes. Remove test slop, redundant checks, debug statements. Keep business logic tests. Run test suite after cleanup."
```

**Key Insight**: Rather than adding negative instructions which have downstream quality effects, add a separate cleanup pass. Two focused agents outperform one constrained agent.

---

## 5. RFC-Driven DAG Orchestration

The most sophisticated pattern. An RFC-driven, multi-agent pipeline:

1. **Decomposition** -- AI reads RFC and produces work units with dependency DAG
2. **Tiered Pipelines** -- Each unit runs through quality stages based on complexity
3. **Separate Context Windows** -- Each stage runs in its own agent process (eliminates author bias)
4. **Merge Queue with Eviction** -- Units land via rebase; conflicts trigger re-implementation

### Complexity Tiers

| Tier | Pipeline Stages |
|------|----------------|
| trivial | implement -> test |
| small | implement -> test -> code-review |
| medium | research -> plan -> implement -> test -> review -> fix |
| large | research -> plan -> implement -> test -> review -> fix -> final-review |

---

## Choosing the Right Pattern

```
Is the task a single focused change?
+-- Yes -> Sequential Pipeline
+-- No -> Is there a written spec/RFC?
         +-- Yes -> Need parallel implementation?
         |        +-- Yes -> RFC-Driven DAG
         |        +-- No -> Continuous PR Loop
         +-- No -> Need many variations?
                  +-- Yes -> Infinite Agentic Loop
                  +-- No -> Sequential Pipeline + De-Sloppify
```

## Anti-Patterns

1. **Infinite loops without exit conditions** -- Always have max-runs, max-cost, or max-duration
2. **No context bridge between iterations** -- Use SHARED_TASK_NOTES.md or filesystem state
3. **Retrying the same failure** -- Capture error context and feed it to the next attempt
4. **Negative instructions instead of cleanup passes** -- Use de-sloppify
5. **All agents in one context window** -- Separate concerns into different agent processes
6. **Ignoring file overlap in parallel work** -- Need a merge strategy
