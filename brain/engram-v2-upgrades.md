# Engram v2 Upgrades — Implementation Guide

Apply these changes to unlock the advanced patterns documented in `skills/engram-advanced/SKILL.md`.
Each section is a discrete, independent change — apply in order, verify before proceeding to the next.

---

## Prerequisites

Check your installed version:

```bash
engram-mcp --version
# Required: 1.12.0 or higher
# If lower: npm update -g engram-mcp
```

---

## 1. Install / Upgrade

```bash
npm install -g engram-mcp@latest

# Verify progressive disclosure is available:
engram-mcp --help | grep "full"
# Should show: --full  Fetch complete observation content
```

If `--full` does not appear, you are on a version below 1.12.0.
The `mem_get_observation(id, full=true)` call will silently return the same
truncated content as a non-full call on older versions — a silent footgun.

---

## 2. Config Additions for Progressive Disclosure

Add to the `env` block of your engram MCP entry in `~/.claude.json`:

```json
{
  "mcpServers": {
    "engram": {
      "command": "engram-mcp",
      "args": [],
      "env": {
        "ENGRAM_DB": "/Users/<you>/.engram/engram.db",
        "ENGRAM_PROGRESSIVE_DISCLOSURE": "true",
        "ENGRAM_SEARCH_RETURN_HOOK": "title,hook",
        "ENGRAM_TIMELINE_FIELDS": "summary,key_facts,created_at,updated_at",
        "ENGRAM_STALE_THRESHOLD_DAYS": "90"
      }
    }
  }
}
```

| Variable | Effect |
|---|---|
| `ENGRAM_PROGRESSIVE_DISCLOSURE` | Enables the three-level fetch API |
| `ENGRAM_SEARCH_RETURN_HOOK` | `mem_search` returns only `title` + `hook` (one-line summary), not full content |
| `ENGRAM_TIMELINE_FIELDS` | Fields returned by `mem_get_observation` without `full=true` |
| `ENGRAM_STALE_THRESHOLD_DAYS` | Days of inactivity before a topic memory is auto-tagged `[STALE]` |

After editing `~/.claude.json`, restart Claude Code to pick up the changes.

---

## 3. Hook Integration

### PostCompact — reload memory context

When Claude Code compacts the conversation, working memory is lost. This hook
prompts a `mem_context` reload immediately after compaction.

Add to `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PostCompact": [
      {
        "command": "node ~/.claude/hooks/scripts/mem-reload-hint.js",
        "description": "Emit mem_context reload instruction after compaction"
      }
    ]
  }
}
```

Create `~/.claude/hooks/scripts/mem-reload-hint.js`:

```javascript
#!/usr/bin/env node
// Emits a directive that Claude Code surfaces to the model after compaction.
// This is a hint, not a hard tool call — the model acts on it.
process.stdout.write(JSON.stringify({
  type: "instruction",
  content: "Call mem_context to reload session memory before proceeding."
}));
```

### SubagentStop — passive capture

When a subagent stops, extract structured learnings from its final output.

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "command": "node ~/.claude/hooks/scripts/passive-capture.js",
        "description": "Extract Key Learnings sections from subagent output"
      }
    ]
  }
}
```

Create `~/.claude/hooks/scripts/passive-capture.js`:

```javascript
#!/usr/bin/env node
// Reads the subagent's last output from stdin (piped by the hook runner),
// looks for a "Key Learnings" section, and calls mem_capture_passive.
// Requires the engram MCP server to be reachable via CLI.

const input = require("fs").readFileSync("/dev/stdin", "utf8");
const match = input.match(/## Key Learnings\s+([\s\S]+?)(?:\n##|$)/);
if (!match) process.exit(0);  // nothing to capture

const payload = JSON.stringify({ content: match[1].trim() });
require("child_process").execFileSync('engram-cli', ['capture-passive', payload], { stdio: 'inherit' });
```

---

## 4. Seance Log Format

Seance queries rely on session summaries being structured consistently.
The `mem_session_summary` tool writes the canonical format:

```
## Goal
[One sentence: what were we working on]

## Discoveries
- [Technical findings, gotchas]

## Accomplished
- [Completed tasks with key details]

## Relevant Files
- path/to/file.py -- [what changed and why]
```

For Seance to work well across months of sessions:

- The `Goal` line must be specific (not "worked on A3"). Include the module or task name.
- `Discoveries` entries must be self-contained — a future session reading only this
  observation should understand the finding without the rest of the session.
- `Relevant Files` must include both path AND reason — path alone is useless if the
  file moves or is renamed.

Call `mem_session_summary` as the **last action** before declaring a session done,
without exception. Seance cannot interrogate a session that left no summary.

---

## 5. Citation Workflow

**In daily work:**

```
1. Save a decision:
   mem_save(title="Decision: use Decimal for all pipeline arithmetic",
            content="...", topic_key="convention/arithmetic-type")
   → returns { id: "f4a1b2" }

2. Reference it immediately in your response:
   "All pipeline arithmetic uses Python Decimal [mem:f4a1b2]..."

3. When you encounter [mem:id] in notes from a past session:
   mem_get_observation("f4a1b2")  → Level 1 summary
```

**In CLAUDE.md or docs:**

Avoid inline `[mem:id]` in project docs — IDs are only meaningful to sessions that
can call `mem_get_observation`. In docs, write the decision text directly and note
the topic key for future lookup:

```markdown
All pipeline arithmetic uses Python Decimal (not float).
Topic key for full rationale: `convention/arithmetic-type`
```

---

## 6. Team Sync via Immutable Git Chunks

Engram observations can be exported as immutable chunks and checked into git
for team-wide sharing. This is how knowledge survives team member turnover.

```bash
# Export project-scoped memories to a shareable chunk file:
engram sync --export --project A3 --output .engram/team-sync.jsonl

# Import on another machine / CI:
engram sync --import --file .engram/team-sync.jsonl
```

Chunk format (one JSON object per line):

```jsonl
{"id":"f4a1b2","title":"Decision: Decimal arithmetic","topic_key":"convention/arithmetic-type","created_at":"2026-05-01T...","content":"..."}
{"id":"c8d3e9","title":"Gotcha: utcnow deprecation","topic_key":"gotcha/datetime-utcnow","created_at":"2026-05-08T...","content":"..."}
```

**Rules for the chunk file:**

- Commit only project-scope observations (`scope: "project"`), never personal-scope.
- The file is append-only — never edit or remove lines. Old entries are superseded
  by newer entries with the same `topic_key`, not deleted.
- CI imports the chunk at the start of each run to prime the memory store for
  any agent spawned during the build.

Add to `.gitattributes` to prevent diff noise:

```
.engram/team-sync.jsonl merge=union
```

The `union` merge strategy appends both sides on conflict, which is correct for an
append-only log.
