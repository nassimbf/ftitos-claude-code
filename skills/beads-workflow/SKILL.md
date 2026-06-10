---
name: beads-workflow
description: Beads work ledger — hash-ID tasks, atomic bd update --claim, dependency-aware bd ready, intent memory bd remember/prime. PAUL emits beads instead of markdown phases.
origin: gastownhall/beads
---

# Beads Workflow

Beads is a hash-ID work ledger designed for multi-agent environments. It solves three problems that git and markdown task lists cannot:

1. **Race conditions** — two agents claiming the same task simultaneously. `bd update --claim` is atomic; the second claimer gets a conflict error.
2. **Plan-file rot** — markdown task lists drift from reality. Beads uses semantic decay to compact closed work and keep the ledger honest.
3. **Intent amnesia** — git log tells you what changed; beads tell you why. Intent notes survive fresh-context loops.

> Yegge's framing: git is the What/Where/How. Beads are the Why.

---

## Installation

```bash
# One-time per machine (Beads is a Go binary, not a Python package)
brew install gastownhall/tap/beads
# or: go install github.com/gastownhall/beads/cmd/bd@latest

# One-time per project (zero footprint — no files added to project root)
bd init --stealth
```

`--stealth` writes the bead store to `.beads/` (gitignored by default) rather than creating any file in the project root. Never run `bd init` without `--stealth` in a project that has its own file conventions.

---

## Core Commands

### `bd init --stealth`

Initialize the bead store for this project.

```bash
bd init --stealth
# → Initialized bead store at .beads/ (0 beads)
```

### `bd add "task description" [--depends-on HASH]`

Create a task bead. Returns a hash ID.

```bash
bd add "Implement rollforward node in graph_v2"
# → bead a3f7c2b1 created

bd add "Write tests for rollforward node" --depends-on a3f7c2b1
# → bead 9d2e1f4a created (blocked by a3f7c2b1)
```

Hash IDs are content-addressed (SHA-256 of description + timestamp). They are stable across worktree merges — no conflicts when two branches add beads independently.

### `bd update HASH --claim`

Atomically claim a bead. Fails if already claimed.

```bash
bd update a3f7c2b1 --claim
# → claimed by session sess-abc123

# Concurrent agent tries the same:
bd update a3f7c2b1 --claim
# → ERROR: bead a3f7c2b1 already claimed by sess-abc123 (since 14:22:03)
```

This is the only write operation that is guaranteed atomic. All multi-agent coordination flows through `--claim`. Never start work on a task without claiming it first.

### `bd ready`

Return the next available task, respecting the dependency graph.

```bash
bd ready
# → a3f7c2b1 "Implement rollforward node in graph_v2" [unclaimed]

# After a3f7c2b1 is done:
bd ready
# → 9d2e1f4a "Write tests for rollforward node" [unclaimed, dependency satisfied]

# When all tasks done:
bd ready
# → (empty) — work queue is exhausted
```

A loop that calls `bd ready` at the start of each iteration never asks "what should I do next?" — the answer is always defined by the queue state. Empty queue = done.

### `bd remember "intent note"`

Attach an intent note to the currently claimed bead.

```bash
bd remember "depreciation_method must come from Anlagenspiegel, not inferred from asset_class — hardcoding was the bug in the prev attempt"
# → note saved to bead a3f7c2b1
```

Intent notes answer: "why did we do it this way?" They survive fresh-context loops; git log does not carry this.

### `bd prime`

Load intent notes for all claimed and recently completed beads into context before starting work.

```bash
bd prime
# → Loaded 3 intent notes into context:
#    a3f7c2b1: "depreciation_method must come from Anlagenspiegel..."
#    7b3a9f12: "ProRata is always calendar-year aligned (Jan 1 base)"
#    c4e8d221: "Anlagenspiegel must reconcile to balance sheet exactly — Decimal only, no float"
```

Always run `bd prime` at the start of a fresh-context session before claiming any task. This is what prevents the agent from re-discovering facts the previous session already established.

### `bd done HASH`

Mark a bead complete. Triggers semantic decay on old beads.

```bash
bd done a3f7c2b1
# → bead a3f7c2b1 marked complete
# → semantic decay: 2 beads older than 14 days compacted to summaries
```

Semantic decay compacts completed beads that are older than the decay threshold (default: 7 days) into a one-line summary, keeping the ledger fast to read. Full content is archived, not deleted.

### `bd status`

Queue overview.

```bash
bd status
# → 8 total | 3 done | 2 claimed | 3 ready | 0 blocked

# DONE:     a3f7c2b1  rollforward node
#           7b3a9f12  opening balance node  
#           c4e8d221  subledger recon node
# CLAIMED:  9d2e1f4a  rollforward tests        [sess-abc123 since 14:22]
#           2f1b8e3c  opening balance tests     [sess-def456 since 14:19]
# READY:    d7c4a1b9  parallel dispatcher
#           e5f2b8c3  anlagengitter verification
#           f1a3d7e2  notes disclosure node
```

---

## PAUL Integration

PAUL phases generate beads instead of markdown task lists. Each task in a PAUL phase becomes one `bd add` call with proper dependency wiring.

### Before (PAUL markdown — rots)

```markdown
## Phase 2 — Build graph nodes

- [ ] Implement rollforward node
- [ ] Write rollforward tests
- [ ] Implement opening balance node
- [ ] Write opening balance tests
- [ ] Wire parallel dispatcher
```

This list drifts. Agents partially complete it and forget to update checkboxes. It provides no dependency ordering and no claim mechanism.

### After (PAUL → Beads emission)

```bash
# PAUL emits these commands at phase start:
bd add "Implement rollforward node in graph_v2"
# → a3f7c2b1

bd add "Write tests for rollforward node" --depends-on a3f7c2b1
# → 9d2e1f4a

bd add "Implement opening balance node in graph_v2"
# → 7b3a9f12

bd add "Write tests for opening balance node" --depends-on 7b3a9f12
# → 2f1b8e3c

bd add "Wire parallel dispatcher" --depends-on a3f7c2b1 --depends-on 7b3a9f12
# → d7c4a1b9
```

Now the dependency graph is explicit. `bd ready` returns only tasks whose dependencies are done. `bd update --claim` prevents races. `bd status` shows real state. No checkbox drift.

**Rule:** Every PAUL phase document that would have contained `- [ ]` task items instead contains `bd add` commands. The plan file records the commands; the bead store records the state.

---

## Multi-Agent Claim Sequence

Three agents start simultaneously. All call `bd ready`.

```
T=0   Agent-A: bd ready → a3f7c2b1 "rollforward node"
T=0   Agent-B: bd ready → a3f7c2b1 "rollforward node"   (same answer — not yet claimed)
T=0   Agent-C: bd ready → 7b3a9f12 "opening balance node"

T=1   Agent-A: bd update a3f7c2b1 --claim → SUCCESS (claimed)
T=1   Agent-B: bd update a3f7c2b1 --claim → ERROR: already claimed by Agent-A

T=2   Agent-B: bd ready → 7b3a9f12 "opening balance node"   (next available)
T=2   Agent-B: bd update 7b3a9f12 --claim → ERROR: already claimed by Agent-C

T=3   Agent-B: bd ready → (next unclaimed item, or empty if none)
```

Agent-B never gets stuck in a claim war — `bd ready` always advances to the next unclaimed task. If the queue is empty, Agent-B exits cleanly. No polling loop, no exponential backoff, no coordination message passing.

---

## Merge Safety

Hash IDs are content-addressed. When two parallel worktrees each add beads independently:

```
main branch:    a3f7c2b1, 9d2e1f4a
feat/branch-A:  a3f7c2b1, 9d2e1f4a, c4e8d221  (added new bead)
feat/branch-B:  a3f7c2b1, 9d2e1f4a, f1a3d7e2  (added different bead)
```

After merging both branches, the bead store contains all four beads with no hash collisions — each bead's hash is derived from its own content, not from sequence position. There is no "bead number 3" that two branches could conflict on.

Claimed state (which agent holds a claim) is session-scoped. Claims do not survive a merge — the merged bead store has all beads in `unclaimed` state, ready for the next session to claim. This is correct behavior: claims are a live-session lock, not a persistent reservation.

---

## Why Over Git

| Capability | Git | Beads |
|---|---|---|
| What changed | `git diff` | — |
| Where it lives | `git log --all --source` | — |
| Who changed it | `git blame` | — |
| Why we chose this approach | — | `bd prime` |
| What task I'm currently doing | — | `bd status --mine` |
| What's available for me to pick up | — | `bd ready` |
| Atomic multi-agent task claim | — | `bd update --claim` |
| Dependency-aware task ordering | — | `--depends-on` graph |

Git is append-only history. Beads are the live operating state. Both are necessary. Neither replaces the other.

---

## Stagnation Prevention

A loop with no beads eventually stops and asks a human "what next?" — the human is the bottleneck.

A loop with beads is self-directing:

```
while true:
  task = bd ready
  if task is empty: break   # work is done
  bd update task.hash --claim
  bd prime                   # load intent notes
  do_work(task)
  bd done task.hash
```

`bd ready` returning empty is the clean exit condition. No human needed. No "I think I'm done" self-assessment. The queue is the truth.

---

## Beads vs. Worktree-Level Task Files

Do not use both. Beads replace worktree-level `TODO.md`, `tasks.md`, and PAUL markdown task lists. Keep PAUL for phase structure and milestone planning — PAUL generates the `bd add` commands, then hands off to beads for execution tracking.

PAUL is the architect. Beads is the foreman.
