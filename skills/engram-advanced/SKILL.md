---
name: engram-advanced
description: Advanced Engram patterns — progressive disclosure index→timeline→full-fetch (~10x token savings), citation IDs, Seance (interrogate dead predecessors), temporal search.
origin: claude-mem patterns + Gas Town Seance
---

# Engram Advanced Patterns

These patterns sit on top of the base Engram setup. They exist because the naive approach
(search → immediately fetch full content) burns 10x more tokens than needed and loses the
ability to reconstruct predecessor reasoning.

---

## 1. Progressive Disclosure

Never load full observation content until you confirm it is what you need. Three levels:

| Level | Tool | Typical output | Token cost |
|-------|------|----------------|------------|
| 0 — index | `mem_search("query")` | Title + one-line hook per result | ~200 |
| 1 — timeline | `mem_get_observation(id)` | Summary + key facts | ~500 |
| 2 — full | `mem_get_observation(id, full=true)` | Complete stored content | ~2000 |

**Protocol:**

```
1. mem_search("your query") → scan titles + hooks only
2. Pick the 1-2 most relevant IDs from the result list
3. mem_get_observation(id) → read summary; abort if not what you need
4. mem_get_observation(id, full=true) → only if summary confirms relevance
```

**Hard rule:** If you can answer the question from Level 0 or Level 1, stop there.
Full-fetch is reserved for when you need to quote, reproduce, or deeply reason about the content.

**Savings math:** A session touching 10 memories full-fetch ≈ 20,000 tokens. The same
session with progressive disclosure ≈ 2,000 tokens for the search + 500 for one confirm
+ 2,000 for one final fetch = 4,500 tokens. ~78% reduction.

---

## 2. Citation IDs

Every `mem_save` call returns an observation ID. Capture it and use it as `[mem:ID]`
when referencing that decision in subsequent output.

**Saving with citation intent:**

```
Tool: mem_save
title: "Decision: use Letta for L0 orchestrator"
content: "**What**: Letta (server mode) chosen for L0...\n**Why**: long-term memory..."
topic_key: "decision:l0-orchestrator"
```

Returns: `{ "id": "abc123", ... }`

**Referencing in responses:**

```
We keep Letta for L0 orchestration [mem:abc123] because replacing it would
require re-implementing the persona and long-term memory layer.
```

**Expanding a citation in a new session:**

```python
# Pseudo-expansion when you encounter [mem:abc123] in notes:
mem_get_observation("abc123")  # → Level 1 summary inline
```

**Why this matters:** Plain prose references ("as we decided earlier") become
citation rot when the session ends. `[mem:ID]` is a stable, machine-resolvable
pointer that works six months later.

---

## 3. Seance Pattern

Seance = interrogating dead predecessor sessions to reconstruct their reasoning.
Use this when you need to understand *why* something was built the way it was,
not just what exists in code.

**Anatomy of a Seance query:**

```
1. mem_search("topic:depreciation-algorithm session:*")
   → returns session IDs where that topic was discussed

2. mem_get_observation("<session-id>")
   → get the session summary (goal, discoveries, accomplished, files)

3. mem_get_observation("<observation-id-from-summary>", full=true)
   → get the specific decision observation from that session
```

**Example:**

```
Q: "What did we decide about the depreciation algorithm last month?"

mem_search("depreciation algorithm decision after:2026-04-01 before:2026-05-31")
→ [{ id: "xyz789", title: "Decision: straight-line vs declining balance", ... }]

mem_get_observation("xyz789")
→ Summary: chose straight-line because IDW PS 253 requires documented basis...

mem_get_observation("xyz789", full=true)  ← only if summary is insufficient
→ Full reasoning, edge cases considered, who approved
```

**Anti-patterns to avoid:**

- Do not use Seance for questions answerable from current code — use grep or GitNexus instead.
  Seance is for *reasoning* (why), code is for *implementation* (what).
- Do not reconstruct the entire predecessor session — pull only the observations relevant
  to your current question.
- Do not trust Seance output for current file paths — code moves; always grep to confirm
  a path found via memory still exists.

---

## 4. Temporal Search

Scope memory searches to a time window when you need sprint-relative or event-relative context.

```
# What changed in the last sprint?
mem_search("query", after="2026-05-15")

# Decisions made before the architecture shift
mem_search("decision architecture", before="2026-05-01")

# Narrow to a specific window
mem_search("agent stack", after="2026-04-01", before="2026-04-30")
```

**When to use:**

| Question shape | Temporal bound |
|---|---|
| "What did we decide last sprint?" | `after=<sprint-start>` |
| "What was the original plan?" | `before=<major-change-date>` |
| "What changed between versions?" | `after=v1-date before=v2-date` |
| "Any recent gotchas?" | `after=<2-weeks-ago>` |

Temporal search does not replace topic-key lookup. If a decision has a `topic_key`
(see Section 5), use that — it is faster and returns the canonical current entry.
Use temporal search when you want *history*, not just the latest state.

---

## 5. Topic-Key Upsert

For knowledge that evolves over time, use `topic_key` to maintain a single canonical
observation instead of accumulating stale duplicates.

**Pattern:**

```
Tool: mem_save
title: "A3 agent stack"
content: "**What**: Letta L0 + LangGraph L1 + pydantic-ai L2..."
topic_key: "architecture/agent-stack"
```

A second `mem_save` with the same `topic_key` updates the existing observation
in place. The update is append-logged internally, so history is preserved, but
search always surfaces the current version.

**Good candidates for topic-key upserts:**

- Architecture decisions (one canonical entry per decision)
- Known gotchas per module (`gotcha/fixed-assets/utcnow-deprecation`)
- Active conventions (`convention/commit-format`)
- Recurring configuration (`config/ruff-version`)

**Bad candidates (use fresh saves instead):**

- Bug fixes — each fix is a discrete event; don't overwrite
- Sprint summaries — each sprint is a separate entry
- Experiments — preserve all attempts even if one superseded another

**Deduplication before saving:**

```
# Before ANY mem_save, search first:
mem_search("topic:architecture agent-stack")
# If result found → use its topic_key in your save (triggers upsert)
# If not found → save with a new topic_key
```

This search-first discipline prevents the memory store from accumulating 40 near-identical
"A3 uses Letta for L0" entries across sessions.

---

## 6. Memory Hygiene

**Search before save.** Every `mem_save` should be preceded by a `mem_search` to confirm
no duplicate exists. A memory store with 200 near-identical entries is harder to search than
one with 20 canonical entries.

**Stale reference check.** If a memory entry names a specific file path or function:
```bash
grep -r "function_name" ~/projects/A3/  # confirm it still exists
```
Do not recommend code based on a memory that references a path that no longer exists.
Update or invalidate the memory if the code has moved.

**90-day decay rule.** A topic memory not updated in 90 days should be tagged `stale`
in its title prefix: `[STALE] Decision: auth approach`. This signals that it should be
verified against current code before being trusted.

```
# Update stale tag:
Tool: mem_update
id: "<observation-id>"
title: "[STALE] Decision: auth approach"
```

**Session boundary discipline.**

- Session start: `mem_context` → load what the previous session left behind.
- Session end: `mem_session_summary` → mandatory before declaring done.
  The summary is what Seance queries will hit first when a future session asks
  "what happened in the session that built X?"

**PostCompact reload.** After any compaction event, call `mem_context` to restore
session context. Hook this in `~/.claude/settings.json` PostCompact:

```json
{
  "hooks": {
    "PostCompact": [
      {
        "command": "echo 'mem_context reload triggered'",
        "description": "Remind Claude to call mem_context after compaction"
      }
    ]
  }
}
```

---

## Quick Reference

```
Search first, load later:
  mem_search("query")                          → Level 0 (titles)
  mem_get_observation(id)                      → Level 1 (summary)
  mem_get_observation(id, full=true)           → Level 2 (full)

Cite what you save:
  mem_save(...) → returns id → use as [mem:id]

Interrogate predecessors:
  mem_search("topic:X") → session IDs → mem_get_observation(session_id)

Time-bound searches:
  mem_search("query", after="2026-05-01")

Deduplicate with topic keys:
  mem_save(..., topic_key="decision:X")  → upserts if key exists
```
