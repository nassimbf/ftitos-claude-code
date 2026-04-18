# BASE -- Workspace State Management

BASE is the data layer that tracks everything in your workspace: projects, satellites, operator profile, and structured data surfaces. It is the single source of truth for what exists, where it lives, and whether it needs attention.

## What It Does

- **Project registry**: Tracks all active projects, their locations, and staleness
- **Satellite tracking**: Links external directories (outside `projects/`) back to the workspace
- **Operator profile**: Stores your identity, values, north star metric, and elevator pitch
- **Data surfaces**: Structured JSON files for tracking work items, entities, ideas, and state
- **Grooming**: Periodic staleness checks with configurable cadence per area
- **Audit strategies**: Per-area audit rules (staleness threshold, dead-code detection)

## Key Files

| File | Purpose |
|------|---------|
| `~/.base/workspace.json` | Workspace config: areas, surfaces, satellites, groom cadence |
| `~/.base/operator.json` | Operator identity and profile sections |
| `~/.base/data/projects.json` | Unified active work + backlog tracking |
| `~/.base/data/entities.json` | People, organizations, systems |
| `~/.base/data/state.json` | Workspace health and drift tracking |
| `~/.base/data/psmm.json` | Per-session meta memory (context injected at session start) |
| `~/.base/data/ideas.json` | Product idea lifecycle: BACKLOG to LIVE |
| `~/.base/data/staging.json` | Proposed changes staged for review |
| `~/.base/data/orchestration.json` | Multi-execution run tracking |
| `~/.base/data/team.json` | Team member skill matrix and load |

## Commands

| Command | What It Does |
|---------|-------------|
| `/base:status` | Show workspace health, project status, surface counts |
| `/base:orientation` | Interactive operator profile completion (deep why, north star, values, elevator pitch, surface vision) |
| `/base:pulse` | Quick health check across all areas |
| `/base:scaffold` | Initialize BASE in a new workspace |
| `/base:groom` | Run staleness checks and surface cleanup |
| `/base:weekly` | Weekly review: surfaces, satellites, drift |
| `/base:surface-create` | Create a new data surface |
| `/base:surface-list` | List all registered surfaces |
| `/base:surface-convert` | Convert existing data into a surface |
| `/base:history` | Show workspace change history |

## Concepts

### Areas

An area is a tracked directory or concern in the workspace. Each area has:

- **type**: `directory`, `satellite`, `system-layer`, `config-cross-ref`, `knowledge-base`
- **paths**: Where it lives on disk
- **groom**: How often to check it (`weekly`, `monthly`)
- **audit.strategy**: How to detect problems (`staleness`, `dead-code`)
- **audit.config**: Strategy-specific settings (e.g., `threshold_days: 14`)

### Satellites

Satellites are projects that live outside the `projects/` directory but are still tracked by BASE. They have their own PAUL state and grooming checks.

```json
{
  "TrendSurfer": {
    "path": "Desktop/TrendSurfer-v2",
    "engine": "paul",
    "state": "Desktop/TrendSurfer-v2/.paul/STATE.md",
    "paul_tracked": true,
    "groom_check": true,
    "loop_position": "IDLE"
  }
}
```

### Data Surfaces

A surface is a structured JSON file under `~/.base/data/` with a defined schema. Surfaces are the primary way BASE tracks structured information.

Each surface has:
- **file**: Path relative to `~/.base/`
- **description**: What it tracks
- **hook**: Whether changes trigger session hooks
- **silent**: Whether to suppress notifications
- **schema**: Field definitions, ID prefix, valid statuses

See [data-surfaces.md](data-surfaces.md) for details.

## Integration with Other Frameworks

- **PAUL**: BASE registers PAUL-tracked projects as satellites with `paul_tracked: true`. The `loop_position` field syncs from `.paul/STATE.md`.
- **CARL**: BASE triggers CARL hygiene checks on its own cadence (`carl_hygiene.cadence`). Stale rules are flagged.
- **Aegis**: Aegis audits run independently but their findings can be tracked in BASE surfaces.
- **Sprint pipeline**: BASE surfaces (projects, orchestration) track which projects are in which pipeline phase.

## Setup

1. Create the `~/.base/` directory
2. Copy `workspace.json.template` and fill in your areas
3. Copy `operator.json.template` and run `/base:orientation` to complete it
4. Create `~/.base/data/` and initialize surfaces as needed

See [workspace.json.template](workspace.json.template) and [operator.json.template](operator.json.template).
