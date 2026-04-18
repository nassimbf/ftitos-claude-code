# Data Surfaces

A data surface is a structured JSON file managed by BASE. Surfaces provide a consistent way to track work items, entities, ideas, and state across sessions.

## What a Surface Is

Each surface is a JSON file under `~/.base/data/` with a declared schema. The schema defines:

- **id_prefix**: How IDs are generated (e.g., `PRJ-001`, `ENT-002`)
- **required_fields**: Fields every entry must have
- **priority_levels**: Valid priority values (if applicable)
- **status_values**: Valid lifecycle states

Surfaces are registered in `workspace.json` under the `surfaces` key.

## Built-in Surfaces

| Surface | File | Purpose |
|---------|------|---------|
| projects | `data/projects.json` | Active work items and backlog. Each entry has id, name, status, type, priority. |
| entities | `data/entities.json` | People, organizations, and systems relevant to your work. |
| state | `data/state.json` | Workspace health tracking. Drift detection, groom history. |
| psmm | `data/psmm.json` | Per-session meta memory. Context injected at session start for continuity. |
| ideas | `data/ideas.json` | Product idea lifecycle. Tracks ideas from BACKLOG through LIVE. |
| staging | `data/staging.json` | Proposed changes staged for review before committing to other surfaces. |
| orchestration | `data/orchestration.json` | Multi-execution run tracking. Active runs, queue, resource conflicts. |
| team | `data/team.json` | Team member skill matrix and workload. |

## Surface Properties

```json
{
  "file": "data/projects.json",
  "description": "Unified active work + backlog tracking",
  "hook": true,
  "silent": true,
  "schema": {
    "id_prefix": "PRJ",
    "required_fields": ["id", "name", "status", "type"],
    "priority_levels": ["critical", "high", "medium", "low"],
    "status_values": ["active", "paused", "shipped", "archived", "backlog"]
  }
}
```

- **hook**: When `true`, changes to this surface trigger session hooks (useful for notifications, PSMM injection)
- **silent**: When `true`, suppress UI notifications for changes (background tracking)

## Creating a New Surface

Use `/base:surface-create` or add the surface manually:

1. Add the surface definition to `workspace.json` under `surfaces`
2. Create the JSON file under `~/.base/data/`
3. Initialize the file with an empty array `[]` or appropriate default structure

Example -- adding a "metrics" surface:

```json
{
  "surfaces": {
    "metrics": {
      "file": "data/metrics.json",
      "description": "Weekly KPI tracking",
      "hook": false,
      "silent": true,
      "schema": {
        "id_prefix": "MET",
        "required_fields": ["id", "week", "metric", "value"],
        "priority_levels": [],
        "status_values": []
      }
    }
  }
}
```

## PSMM (Per-Session Meta Memory)

The `psmm` surface is special. Its entries are injected into the session context at startup, providing continuity across conversations. Entries have a status field:

- **active**: Injected at session start
- **resolved**: No longer injected, kept for history
- **carry_forward**: Injected and flagged for ongoing attention

This is how the system remembers "where you left off" between sessions.

## Staging Surface

The `staging` surface acts as a review gate. Proposed changes to other surfaces are written here first, then approved or rejected before being applied. This prevents accidental data loss and provides an audit trail.
