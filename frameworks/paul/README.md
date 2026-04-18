# PAUL -- Phased Project Planning

PAUL is a milestone-based planning framework that breaks projects into numbered phases with a structured execution loop. Each project gets its own `.paul/` directory with state tracking that persists across sessions.

## What It Does

- **Milestone planning**: Defines what "done" looks like for each version
- **Phase decomposition**: Breaks milestones into sequential, scoped phases
- **Execution loop**: Structured cycle of discuss, plan, apply, verify, unify
- **State persistence**: Tracks current phase, loop position, and timestamps in `paul.json`
- **BASE integration**: Reports progress to workspace surfaces and satellite tracking

## Key Files

Each PAUL-initialized project has a `.paul/` directory:

| File | Purpose |
|------|---------|
| `paul.json` | Machine-readable state: project name, milestone, phase, loop position |
| `PROJECT.md` | Project brief: what it is, why it matters, constraints |
| `ROADMAP.md` | Phase roadmap: all phases with descriptions and exit criteria |
| `STATE.md` | Human-readable current state: what is happening right now |

## Commands

| Command | What It Does |
|---------|-------------|
| `/paul:init` | Initialize PAUL in the current project directory |
| `/paul:plan` | Create a phased implementation plan for the current milestone |
| `/paul:apply` | Execute the current phase (write code, run tests) |
| `/paul:verify` | Verify the current phase meets its exit criteria |
| `/paul:unify` | Merge phase work into the project, advance to next phase |
| `/paul:progress` | Show current status with routing suggestions |
| `/paul:status` | Quick status check (phase, loop position) |
| `/paul:discuss` | Open-ended discussion about a phase before planning |
| `/paul:milestone` | Show or update milestone details |
| `/paul:discuss-milestone` | Discuss milestone scope and priorities |
| `/paul:complete-milestone` | Mark a milestone as complete, set up next |
| `/paul:add-phase` | Add a new phase to the roadmap |
| `/paul:remove-phase` | Remove a phase from the roadmap |
| `/paul:research` | Research a topic relevant to the current phase |
| `/paul:research-phase` | Deep research for a specific phase |
| `/paul:discover` | Discovery mode: explore unknowns before planning |
| `/paul:handoff` | Prepare handoff notes for session continuity |
| `/paul:pause` | Pause the current phase |
| `/paul:resume` | Resume a paused phase |
| `/paul:config` | View or update PAUL configuration |

## Phase Lifecycle

A phase moves through a structured loop:

```
IDLE
  │
  ▼
DISCUSS ──── Open-ended exploration of the phase scope
  │
  ▼
PLAN ─────── Write a concrete implementation plan
  │
  ▼
APPLY ────── Execute the plan (code, tests, config)
  │
  ▼
VERIFY ───── Check exit criteria, run tests, validate
  │
  ▼
UNIFY ────── Merge work, update state, advance to next phase
  │
  ▼
IDLE (next phase)
```

The loop position is tracked in `paul.json` under `loop.position`. You can enter any step with `/paul:<step>`, but the intended flow is sequential.

## paul.json Structure

```json
{
  "name": "ProjectName",
  "version": "0.0.0",
  "milestone": {
    "name": "v0.1 Sprint 0 Prototype",
    "version": "0.1.0",
    "status": "in_progress"
  },
  "phase": {
    "number": 3,
    "name": "Core Logic Implementation",
    "status": "complete"
  },
  "loop": {
    "plan": null,
    "position": "IDLE"
  },
  "timestamps": {
    "created_at": "2026-04-02T21:52:46Z",
    "updated_at": "2026-04-03T05:20:00Z"
  },
  "satellite": {
    "groom": true
  }
}
```

See [paul.json.template](paul.json.template) for a blank starting point.

## Integration with Other Frameworks

- **BASE**: Projects with `paul_tracked: true` in `workspace.json` have their loop position synced to satellite tracking. BASE grooming checks PAUL state for staleness.
- **Aegis**: Aegis audits can run during the VERIFY step. The sprint pipeline triggers `/aegis:audit` during the REVIEW phase.
- **CARL**: Architectural decisions made during DISCUSS or PLAN should be logged in CARL for cross-session persistence.
- **Sprint pipeline**: PAUL phases map to the BUILD step. The pipeline runs `VALIDATE -> PLAN -> BUILD -> REVIEW -> TEST -> SHIP -> MONITOR`, where BUILD executes PAUL phases.

## Setup

1. Navigate to your project directory
2. Run `/paul:init`
3. Fill in `PROJECT.md` with project brief
4. Run `/paul:plan` to create the phase roadmap
5. Begin the loop with `/paul:discuss` or `/paul:apply`
