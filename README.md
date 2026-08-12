# ftitos-claude-code v4

A Claude Code harness for shipping a startup. Five hooks that enforce, six skills that
get used, three rules files. Everything else was measured and removed.

## Why v4 is smaller than v3

v3 shipped 32 skills, 23 agents, 15 commands and 16 rules files. An audit of 7,077 real
prompts over 4.5 months found that 26 of the 32 skills had never been invoked once, 8 of
the 15 commands had zero uses, and the always-on context cost was **22,162 tokens per
session before the user typed anything**.

v4 is what was left after removing everything with no evidence behind it.

| | v3 | v4 |
|---|---|---|
| Always-on context | ~22,200 tokens | **~5,800 tokens** |
| Skills | 32 | 6 |
| Agents | 23 | 6 |
| Commands | 15 | 9 |
| Rules files | 16 | 3 |
| Hooks wired | 45 (8 duplicated) | 15 |

## The idea

Markdown is advice. Hooks are enforcement. Anything that can be a hook should be a hook,
and anything that cannot earn its context budget should not ship.

## Hooks

| Hook | Event | What it stops |
|---|---|---|
| `cc-safety-net.js` | PreToolUse: Bash | `rm -rf ~`, `git clean -fdx`, force-push, bare `git stash pop`, and interpreter one-liners that wrap the same. Unwraps `sh -c`/`eval` recursively rather than regex-matching the surface. |
| `pre-secrets-block.js` | PreToolUse: Write\|Edit | Writes to `.env`, `*.pem`, `*.key`, `id_rsa`, `credentials.*`. Content carrying `sk-`, `ghp_`, `AKIA`, PEM blocks, or a password/token assigned a real literal. Allows `*.example`, `*.template`, and env-var references. |
| `stop-verify.js` | Stop | The model claiming it is done while ruff/mypy/pytest fail. Resolves tools from the project `.venv` so a global binary never verifies a venv project. |
| `gateguard-pre-edit.js` + `gateguard-track-read.js` | PreToolUse / PostToolUse | Editing a file that has not been read. |
| `post-edit-combined.js` | PostToolUse: Edit | Format and typecheck drift, on every edit rather than at the end. |

## Install

```bash
git clone https://github.com/ftitos/ftitos-claude-code.git
cd ftitos-claude-code
./install.sh
npm run doctor
```

`doctor` exits non-zero on duplicate hook registrations, hooks pointing at scripts that do
not exist, repo/install version drift, and an always-on context budget over 8,000 tokens.
The v2 doctor reported "healthy" on a config with all four problems; this one does not.

## Commands

| Command | Purpose |
|---|---|
| `/go "feature"` | Full pipeline: validate → plan → build → review → test → ship |
| `/plan` | Implementation plan before code |
| `/project:sprint` | Advance one pipeline phase |
| `/project:status` | Where the sprint is |
| `/project:review` | 7-specialist review army + adversarial council on CRITICAL findings |
| `/project:analyze` | Cross-artifact consistency gate |
| `/project:ship` | Push with validation |
| `/project:init` | Wire a new project |
| `/project:constitution` | Versioned project governance |

The review army and council prompts live inside `commands/project/review.md`, not in
`rules/`. They are ~10 KB and are needed roughly ten times a year, so they load on demand.

## Agents

`code-reviewer` · `security-reviewer` · `debugger` · `planner` · `python-reviewer` · `architect`

Six, because the audit found three agent types dispatched across the entire history.

## Development

```bash
npm test          # structural validation + secrets-block behaviour tests
npm run doctor    # health check against the installed config
```

## License

MIT
