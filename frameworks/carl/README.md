# CARL -- Dynamic Rules and Decision Logging

CARL is a rule and decision management system that runs as an MCP server. It provides domain-scoped rules that are loaded contextually based on recall keywords, plus persistent decision logging with rationale capture.

## What It Does

- **Domain-scoped rules**: Rules grouped by domain (GLOBAL, DEVELOPMENT, APW, etc.) with recall keywords that trigger loading
- **Decision logging**: Structured decision records with rationale, searchable across domains
- **Rule staging pipeline**: New rules go through propose, stage, approve before becoming active
- **Always-on domains**: Some domains (GLOBAL) load every session regardless of context
- **MCP integration**: All operations happen through MCP tool calls, no CLI commands

## How It Works

CARL stores everything in a single `carl.json` file. The MCP server (Node.js) provides CRUD operations for domains, rules, decisions, and the staging pipeline.

When a session starts, CARL loads:
1. All `always_on` domains (rules active in every session)
2. Domains whose `recall` keywords match the current task context

Rules influence agent behavior during the session. Decisions persist as a searchable log of past choices.

## Key Concepts

### Domains

A domain is a named group of rules and decisions. Each domain has:

- **state**: `active` or `inactive`
- **always_on**: If `true`, rules load every session
- **recall**: Keywords that trigger domain loading (e.g., "python", "auth", "deployment")
- **rules**: Numbered behavioral rules
- **decisions**: Logged decisions with rationale

### Rules

Rules are short behavioral directives. They tell the agent what to do or not do in specific contexts.

```json
{
  "id": 0,
  "text": "NEVER use relative paths in code -- use absolute.",
  "added": "2026-04-01",
  "source": "manual"
}
```

Sources: `manual` (human-authored), `psmm` (derived from session memory), `staging` (approved from pipeline).

### Decisions

Decisions record what was decided, why, and when. They are searchable across all domains.

```json
{
  "id": "development-001",
  "decision": "Use integer cents for all monetary calculations",
  "rationale": "Floating-point arithmetic introduces rounding errors that compound in financial calculations",
  "recall": "money, currency, financial, calculation",
  "timestamp": "2026-04-02T10:30:00Z",
  "status": "active"
}
```

### Rule Staging Pipeline

New rules flow through a pipeline before becoming active:

```
Propose --> Stage --> Review --> Approve (becomes active rule)
                          └──-> Archive (kept for reference, not active)
                          └──-> Kill (deleted permanently)
```

This prevents rule bloat and ensures quality.

## MCP Tools (carl_v2_* API)

### Domain Management

| Tool | Purpose |
|------|---------|
| `carl_v2_list_domains` | List all domains with rule/decision counts and state |
| `carl_v2_get_domain` | Get full domain: rules, decisions, recall, state |
| `carl_v2_create_domain` | Create a new domain with recall keywords |
| `carl_v2_toggle_domain` | Enable or disable a domain |

### Rule Management

| Tool | Purpose |
|------|---------|
| `carl_v2_add_rule` | Add a rule to a domain (auto-assigns ID) |
| `carl_v2_remove_rule` | Remove a rule by ID |
| `carl_v2_replace_rules` | Replace all rules in a domain (bulk update) |

### Decision Logging

| Tool | Purpose |
|------|---------|
| `carl_v2_log_decision` | Log a decision with rationale and recall keywords |
| `carl_v2_search_decisions` | Search decisions by keyword across all domains |
| `carl_v2_archive_decision` | Archive a decision (no longer active, kept for history) |

### Staging Pipeline

| Tool | Purpose |
|------|---------|
| `carl_v2_stage_proposal` | Stage a new rule proposal |
| `carl_v2_get_staged` | List all pending proposals |
| `carl_v2_approve_proposal` | Approve a proposal (adds rule to target domain) |

### Configuration

| Tool | Purpose |
|------|---------|
| `carl_v2_get_config` | Get CARL config (devmode, post_compact_gate, global_exclude) |
| `carl_v2_update_config` | Update CARL config fields |

## carl.json Structure

```json
{
  "config": {
    "devmode": false,
    "post_compact_gate": true,
    "global_exclude": []
  },
  "domains": {
    "GLOBAL": {
      "state": "active",
      "always_on": true,
      "recall": ["universal"],
      "exclude": [],
      "rules": [
        {
          "id": 0,
          "text": "Rule text here",
          "added": null,
          "last_reviewed": null,
          "source": "template"
        }
      ],
      "decisions": []
    }
  },
  "staging": []
}
```

See [carl.json.template](carl.json.template) for a blank starting point.

## Integration with Other Frameworks

- **BASE**: BASE triggers CARL hygiene checks on a monthly cadence. Stale rules (older than `staleness_threshold_days`) are flagged for review. `max_rules_per_domain` prevents bloat.
- **PAUL**: Architectural decisions made during PAUL discuss/plan phases should be logged in CARL.
- **Aegis**: Critical decisions discovered during Aegis audits should be logged in CARL for cross-session persistence.
- **Session lifecycle**: PSMM entries can be promoted to CARL rules through the staging pipeline.

## Setup

1. The CARL MCP server lives at `~/.carl/carl-mcp/`
2. Register it in `~/.claude.json` under `mcpServers`:
   ```json
   {
     "mcpServers": {
       "carl-mcp": {
         "command": "node",
         "args": ["~/.carl/carl-mcp/index.js"]
       }
     }
   }
   ```
3. Create initial domains with `carl_v2_create_domain`
4. Add a GLOBAL domain with `always_on: true` for universal rules

## Hygiene

CARL hygiene prevents rule rot:

- **Monthly review**: Check all rules for staleness
- **Max rules per domain**: Default 15. Forces prioritization.
- **Staleness threshold**: Rules not reviewed in 60 days get flagged
- **Decision archiving**: Old decisions can be archived to reduce noise
