# CLAUDE.md

## What

ftitos-claude-code is an installable Claude Code harness. v4 is deliberately small: the
value is in five hooks that enforce behaviour deterministically, not in a library of
markdown the model may or may not read.

## Where

```
ftitos-claude-code/
├── agents/          # 14 agents — no count cap; the budget decides
│   └── ECC-LICENSE  # 9 of them vendored from affaan-m/ecc (MIT)
├── skills/          # 9 skills — no count cap; the budget decides (skills/TIER.md)
├── rules/           # 3 always-on files: code, workflow, security
│   ├── python/      # language-specific, loaded on demand
│   └── typescript/
├── hooks/
│   ├── hooks.json   # 18 registrations, merged into settings.json at install
│   └── scripts/     # 19 scripts — the enforcement layer
├── scripts/
│   ├── ci/          # 6 validators, run by doctor and the git hooks
│   └── ...          # install-apply, uninstall, doctor, devendor-gstack
├── tests/           # 17 files, run by the pre-commit gate
├── templates/
│   └── git-hooks/   # pre-commit + commit-msg, installed into a clone
├── .vendor/         # gitignored clones of 13 evaluated repos — VENDOR-MINING.md
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

The reverse direction leaked too, and it was the one nobody noticed: `install-apply.js`
skipped any file that already existed, so a hook fixed *here* never reached `~/.claude`.
On 2026-09-14 the live `cc-safety-net.js` ran several fixes behind this repo and twice
refused legitimate work while the repo copy had been correct all along.

**Fixed** (`e42eebc`, `20644e8`). The installer now compares content and reports three
distinct outcomes — `SKIP (identical)`, `WOULD COPY`, `WOULD UPDATE (stale)` — backing up
before it overwrites. It also matches hook registrations by *resolved path*, because
`$HOME/...` and `/Users/you/...` are the same registration and comparing raw strings
re-created the v4 duplicate-hooks bug: one install produced 9 duplicates, and a duplicated
PreToolUse entry runs every guard twice on every call.

So `./install.sh` is now the way to sync, and running it twice is a no-op:

```bash
./install.sh --dry-run   # what would change, and why
./install.sh             # apply; backs up anything it overwrites
node scripts/doctor.js   # asserts no duplicate registrations
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

Four of them, and each of the first three exists because the previous one could
be walked around.

| Gate | Enforces |
|---|---|
| `.git/hooks/pre-commit` | 17 test files + doctor |
| `.git/hooks/commit-msg` | a `fix:`/`feat:` commit carries a regression test |
| `block-no-verify.js` | that the two above cannot be skipped |
| `ship-gate.js` | what leaves: secrets, debug artifacts, untracked TODOs |

The third is the load-bearing one. Before it, every gate here was optional —
`--no-verify`, or `-c core.hooksPath=`, and none of it ran.

The fourth closes a different gap. The first three protect *this* repo; nothing
checked what got pushed out of the repos this harness is used on.
`rules/security.md` already required a dependency audit before ship and
`rules/code.md` already banned debug artifacts and TODO-without-issue-reference —
as prose, which the model may skip. `ship-gate.js` fires on `git push` and
`gh pr create` and makes those an exit code.

It deliberately does **not** run the test suite or measure coverage. Those take
minutes, and a gate that takes minutes is a gate people route around — which is
precisely why the third gate had to exist. Fast, certain, and embarrassing in
front of a client is the whole bar.

## Development

```bash
node tests/run-all.js
node scripts/doctor.js
./install.sh --dry-run
```
