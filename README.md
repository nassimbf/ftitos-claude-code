# ftitos-claude-code

My Claude Code setup, v7. The v6 harness (Node hooks, installer, doctor) is gone; it is
in git history at `38036b5`. v7 does not write its own framework any more. It installs
two maintained suites and adds a small set of my own files on top.

## What is in it

| Layer | Source | Job |
|---|---|---|
| ECC, profile `core` | `npx ecc-universal@2.2.1` | Language knowledge, agents, standard hooks |
| gstack | `garrytan/gstack` | Workflows: `/spec`, `/review`, `/cso`, `/devex-review` |
| Plugins | ponytail, caveman, i-have-adhd, warp | Always-on code and reply style |
| **This repo, `claude/`** | mine | Rules, output style, three skills, A3 hooks, settings |

`claude/` mirrors `~/.claude/`:

| Path | What it does |
|---|---|
| `CLAUDE.md` | Global instructions: test budget, push rule, style pointer |
| `rules/ponytail.md` | How to code: the laziest solution that works |
| `rules/engineering.md` | Minimal code, exhaustive checks; TDD order; commits |
| `rules/security.md` | Sink table checked before every commit |
| `rules/tool-routing.md` | gstack owns the verbs, ECC owns the nouns |
| `rules/a3-lessons.md` | One line per mistake no check can catch (written by `/lesson`) |
| `output-styles/ftitos.md` | Reply style: ponytail + caveman + ASD-STE100, STE wins a tie |
| `skills/council/` | `/council diff\|plan\|decision`: blind multi-model review; `outside.sh` calls Codex, then Gemini, then Ollama |
| `skills/brief/` | `/brief`: question the user until no open point is left, then write the branch brief |
| `skills/lesson/` | `/lesson`: turn a corrected mistake into a test, lint rule or hook |
| `hooks/a3hooks.py` | Hooks for A3 work, see below |
| `hooks/test_a3hooks.py` | Self-check for `a3hooks.py` |
| `settings.json` | Hook registration, permissions, plugins, model settings |

## a3hooks.py

One Python file, no dependencies: nine hooks across five events. A crash exits 0, so a hook
bug never blocks a session.

| Event | Hook | Stops |
|---|---|---|
| PreToolUse Bash | `bash-guard` | `SKIP=` commits, force-push to main, `sed -i` inside A3 |
| PreToolUse Edit/Write | `scope-guard` | An A3 edit with no brief, an open brief question, or a path outside scope |
| SessionStart / PostCompact | `session-start`, `post-compact` | Losing the brief and the last hand-over after compaction or `/clear` |
| UserPromptSubmit / Stop | `doubt-inject`, `doubt-check` | An answer to "are you sure?" that opened nothing |
| Stop | `gate` | Ending the turn while ruff, the touched tests or the fast set are red |
| Stop | `speedbump` | A branch over 800 lines or 3 days from main, once per session |
| Stop | `autopush` | Unpushed work: pushes the branch every 30 min, never main, never force |

The A3 checkout defaults to `~/Desktop/A3-core`. Set `A3_REPO` to change it. Outside an A3
checkout only `bash-guard` and the doubt check act.

## Install

1. Back up the current setup: `cp -R ~/.claude ~/.claude-backup-$(date +%Y%m%d)`.
2. Install ECC: `npx ecc-universal@2.2.1 install --target claude --profile core --enable-hooks`.
3. Install gstack: `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`.
4. In Claude Code, add the marketplaces and plugins listed under `extraKnownMarketplaces`
   and `enabledPlugins` in `claude/settings.json`.
5. Copy this repo's files over: `cp -R claude/. ~/.claude/`. This replaces your
   `settings.json` and `CLAUDE.md`; merge by hand if you keep your own.
6. Run the self-check: `/usr/bin/python3 -I ~/.claude/hooks/test_a3hooks.py`.
   It prints `a3hooks self-check: all passed`.

`settings.json` here is sanitized: machine paths became `$HOME` or `~`, and the
machine-specific `autoMode` and `statusLine` blocks are removed. The ECC hook commands
fall back to `~/.claude` to find ECC.

## Update this repo

Copy the same files from `~/.claude/` into `claude/`, run the self-check, and scan the
diff for secrets and client data before you push. The repo is public.
