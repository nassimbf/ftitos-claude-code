---
name: build-phases
description: Drive a substantial build through durable phase artifacts that survive context loss — a roadmap, living state, and per-phase plans with checked parallelism. Use when work is too large for one session, when you need to resume after compaction, or when fanning work out to multiple agents.
origin: open-gsd/gsd-core (.planning model), reimplemented
---

# Build Phases

For work that outlives a single context window.

The failure this exists to prevent: a long build lives in the transcript, the
transcript compacts, and the next session re-derives half of it wrong. Anything
you need after compaction has to be on disk before it.

## The artifacts

```
.planning/
  ROADMAP.md          requirements and phases — what and why, rarely changes
  STATE.md            living memory — where we are, updated every phase
  phases/
    01-name/
      01-01-PLAN.md   one executable plan
      01-02-PLAN.md
```

**ROADMAP.md** lists numbered requirements (`R1`, `R2`…) and the phases that
deliver them. Decimal phases (`2.1`) are urgent insertions between integers.

**STATE.md** carries frontmatter — `status`, `total_phases`, `completed_phases`,
`percent` — and a body holding decisions made, blockers hit, and what the next
session needs to know. Written at the end of every phase, not at the end of the
build.

**PLAN.md** frontmatter is the executable part:

```yaml
phase: 01-name
plan: 01
wave: 1                 # plans in the same wave may run concurrently
depends_on: []          # plan IDs that must finish first — must be in an earlier wave
files_modified: []      # exact paths, not globs
files_deleted: []       # optional; an undeclared deletion is a conflict
requirements: [R1]      # REQUIRED — work with no requirement is work nobody asked for
coupling_justified: []  # optional "peer-id: reason" for a deliberate same-wave overlap
autonomous: true        # false if the plan needs a human mid-flight
```

## The lifecycle

```
PLANNED → IN_PROGRESS → COMPLETE → VERIFIED
                    ↘ BLOCKED
```

`COMPLETE` means the work is written. `VERIFIED` means a command returned green.
Only the second one counts — never mark a phase done on inspection.

## The loop

1. **Discuss** — settle what the phase delivers before planning how. Write it to
   ROADMAP.md as numbered requirements.
2. **Plan** — split the phase into plans. Assign waves by dependency, and list
   every file each plan touches. Be exact; the check below relies on it.
3. **Check** — `node scripts/plan-check.js` from the project root. It fails on
   same-wave file collisions, delete/edit races, dependencies pointing forward or
   sideways, missing plans, and plans with no requirement. Run it before fanning
   out, every time.
4. **Execute** — one plan per agent, one wave at a time. Each agent gets the
   PLAN.md and the repo, never the session transcript.
5. **Verify** — run the project's real check. Green or it is not done.
6. **Record** — update STATE.md before moving on, while you still remember why.

## Parallelism is a claim, and claims get checked

Two plans in one wave are safe only if they touch disjoint files. `plan-check`
verifies that mechanically. Without it, "these are independent" is something a
model asserted under load — and the cost of being wrong is two agents writing
the same file and one of them silently winning.

If two plans genuinely must share a file, say so in `coupling_justified` on both
sides with a reason. Declaring it is cheap; discovering it afterwards is not.

## Resuming

Read STATE.md first, then ROADMAP.md, then the current phase's plans. That order
is deliberate: state tells you where you are, roadmap tells you where you were
going, plans tell you what to do next. Do not read the old transcript — if
something mattered and is not in these three files, the process failed and the
fix is to write it down now.
