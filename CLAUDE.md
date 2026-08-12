# CLAUDE.md

## What

ftitos-claude-code is an installable Claude Code harness. v4 is deliberately small: the
value is in five hooks that enforce behaviour deterministically, not in a library of
markdown the model may or may not read.

## Where

```
ftitos-claude-code/
├── agents/          # 6 specialist agents
├── skills/          # 6 skills (see skills/TIER.md for admission criteria)
├── rules/           # 3 always-on files: code, workflow, security
│   ├── python/      # language-specific, loaded on demand
│   └── typescript/
├── hooks/
│   ├── hooks.json   # 15 registrations, merged into settings.json at install
│   └── scripts/     # the enforcement layer
├── commands/        # /go, /plan, /project:*
├── pipeline/        # 9 phase definitions used by /project:sprint
├── frameworks/      # BASE, PAUL, Aegis, CARL
├── scripts/         # install-apply, uninstall, doctor, diff-scope
├── tests/
├── templates/
├── .archive/        # everything v4 removed, kept for reversibility
└── install.sh
```

## The rule that governs this repo

**Every failure becomes a hook, or it does not become anything.** (Hashimoto rule.)

A rule written in markdown is a rule the model can skip. Before adding a `rules/` entry,
check whether the same guarantee can be made by a script in `hooks/scripts/`. If it can,
write the script instead — and write its test first.

Two live examples, both recovered from `~/.claude` during the v4 audit after they were
fixed in the field and never committed back:

- `cc-safety-net.js` blocks bare `git stash pop`. The stash stack is repo-global and shared
  across worktrees; a bare pop applied another session's WIP into a clean tree and produced
  26 conflicted files.
- `stop-verify.js` resolves ruff/mypy/pytest from the project `.venv`. A Homebrew pytest on
  a different Python produced 188 phantom collection errors on every Stop event.

If you fix something in `~/.claude`, commit it here the same day. v3 lost both of these for
two months because nobody did.

## Conventions

- Zero external dependencies. Node.js built-ins only.
- Every hook script gets a `tests/*.test.js` written before the script.
- Every skill directory needs `SKILL.md` with `name` and `description` frontmatter.
- `hooks.json` must be valid JSON, every entry needs a `type`.
- Removals go to `.archive/`, never `rm`.

## Budget

`node scripts/doctor.js` fails if always-on context exceeds 8,000 tokens. That number is
the whole design constraint — skills, agents, commands and rules all spend from it on every
session. Check it before adding anything.

## Development

```bash
node tests/run-all.js
node scripts/doctor.js
./install.sh --dry-run
```
