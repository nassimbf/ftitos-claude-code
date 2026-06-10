# Cache Retention Policy

## 60-Day Rule

Session and debug caches older than 60 days are eligible for deletion. Files in this category carry no long-term value and accumulate unboundedly without a GC policy.

**Safe to delete (age > 60 days):**
- `~/.claude/sessions/*.tmp` — session scratch files
- `~/.claude/transcripts/*.debug` — debug transcript dumps
- `node_modules/.cache/` inside any project (regenerated on next build)
- `.pytest_cache/` directories inside any project
- `__pycache__/` bytecode directories inside archived or inactive projects

**Never delete:**
- Actual project source files
- Git history (`.git/` directories)
- Committed configuration files
- `~/.claude/settings.json`, `settings.local.json`
- Engram memory store (`~/.engram/`)
- CARL decision log (`~/.carl/`)

---

## GC Command

Run manually or via monthly maintenance hook:

```bash
find ~/.claude/sessions -name "*.tmp" -mtime +60 -delete
find ~/.claude/transcripts -name "*.debug" -mtime +60 -delete
```

Dry-run first to verify scope:

```bash
find ~/.claude/sessions -name "*.tmp" -mtime +60
```

---

## Monthly Maintenance Hook Pattern

Schedule via `/loop 30d` in a Claude Code session, or add to a cron-style task:

```
/loop 720h find ~/.claude/sessions -name "*.tmp" -mtime +60 -delete
```

The `/loop` skill handles the recurring dispatch. No external cron daemon needed.

---

## Entropy GC Doctrine

Cache GC is one half of entropy management. The other half is codebase entropy:

**Doc-gardening (monthly):**
- Scan `rules/`, `skills/`, `agents/` for files not referenced in the last 60 days
- Slop-scan: remove instructions that restate defaults, duplicate each other, or describe behavior that no longer exists
- Golden principle test: if a rule were removed, would behavior visibly degrade? If no — remove it

**Continuous debt paydown (OpenAI pattern):**
- Small auto-mergeable refactor PRs on each sprint cycle, not quarterly cleanup blitzes
- Target: dead code, unused imports, magic numbers → named constants, functions > 50 lines
- Each debt PR is one concern, one commit, one reviewer pass

---

## Hashimoto Rule

Every observed agent failure must produce a permanent engineered fix — not a note, not a TODO, not a memory entry alone.

Fix categories (in order of preference):
1. **Hook** — if the failure is a Bash command pattern, add a hook rule
2. **Lint rule** — if the failure is a code style violation, add a linter config
3. **Sign** — if the failure is a type error, add type annotations
4. **Tool** — if the failure is a missing capability, build the tool

Grow the harness only from observed failures. Configuration that has never prevented a real failure is entropy — remove it at the next doc-gardening cycle.

**Tracking:** Log each Hashimoto fix in CARL under domain `harness-improvements` with the failure description and the fix applied. This creates an auditable record of why each rule exists.
