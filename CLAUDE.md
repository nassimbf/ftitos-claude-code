# CLAUDE.md

## What

ftitos-claude-code is an installable Claude Code harness. v4 is deliberately small: the
value is in five hooks that enforce behaviour deterministically, not in a library of
markdown the model may or may not read.

## Where

```
ftitos-claude-code/
├── agents/          # 6 specialist agents
├── skills/          # 9 skills — no count cap; the budget decides (skills/TIER.md)
├── rules/           # 3 always-on files: code, workflow, security
│   ├── python/      # language-specific, loaded on demand
│   └── typescript/
├── hooks/
│   ├── hooks.json   # 17 registrations, merged into settings.json at install
│   └── scripts/     # 18 scripts — the enforcement layer
├── scripts/
│   ├── ci/          # 6 validators, run by doctor and the git hooks
│   └── ...          # install-apply, uninstall, doctor, devendor-gstack
├── tests/           # 14 files, run by the pre-commit gate
├── templates/
│   └── git-hooks/   # pre-commit + commit-msg, installed into a clone
├── .archive/        # every removal, kept reversible
└── install.sh
```

`commands/`, `pipeline/` and `frameworks/` were removed in v5 (`416e603`). The
first two were never in the installer's copy map — Claude Code had never read a
byte of either. `commands/` was installed and broken: `/go` chained to 17
commands, ten of which did not exist.

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

The reverse direction leaks too, and it is the one nobody notices: `install-apply.js`
skips any file that already exists, so a hook fixed *here* never reaches `~/.claude`
unless you pass `--force` or copy it yourself. On 2026-09-14 the live `cc-safety-net.js`
was two fixes behind this repo and blocked a legitimate commit; the repo copy had been
correct the whole time. Until the installer distinguishes "already present" from
"present and stale", verify the live copy after changing a hook:

```bash
diff hooks/scripts/<name>.js ~/.claude/scripts/hooks/<name>.js
```

## Conventions

- Zero external dependencies. Node.js built-ins only.
- Every hook script gets a `tests/*.test.js` written before the script.
- Every skill directory needs `SKILL.md` with `name` and `description` frontmatter.
- `hooks.json` must be valid JSON, every entry needs a `type`.
- Removals go to `.archive/`, never `rm`.

## Budget

Two instruments, and you want both.

```bash
node scripts/doctor.js                      # ceiling: fails past 8,000 tokens
node scripts/ci/always-on-budget.js         # per file, against a baseline
node scripts/ci/always-on-budget.js --write # record deliberate growth
```

The ceiling catches disasters. The baseline catches creep — the 200-token
description edit that never trips a ceiling but spends the budget just as surely.
Growth fails with the file and the delta named; recording it lands in review as a
one-line diff stating the new cost.

v4 also capped the skill count at 8. That was a proxy, and it was wrong in both
directions: it blocked a 61-token skill while unbounded description growth passed.
The count is no longer asserted.

What the measurement showed first: `rules/*.md` is 57% of the always-on surface.
The skills are the cheap part.

## What the gates actually are

Three of them, and each exists because the previous one could be walked around.

| Gate | Enforces |
|---|---|
| `.git/hooks/pre-commit` | 14 test files + doctor |
| `.git/hooks/commit-msg` | a `fix:`/`feat:` commit carries a regression test |
| `block-no-verify.js` | that the two above cannot be skipped |

The third is the load-bearing one. Before it, every gate here was optional —
`--no-verify`, or `-c core.hooksPath=`, and none of it ran.

## Development

```bash
node tests/run-all.js
node scripts/doctor.js
./install.sh --dry-run
```
