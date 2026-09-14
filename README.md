# ftitos-claude-code

A Claude Code harness for shipping client-ready code. Twenty hooks that enforce,
fourteen agents, nine skills, three always-on rules files. Everything else was
measured and removed.

## The idea

**Markdown is advice. Hooks are enforcement.**

A rule written in a markdown file is a rule the model can skip. A rule written as a
script that exits 2 is not. So the governing rule of this repo is: before adding
anything to `rules/`, check whether the same guarantee can be made by a script in
`hooks/scripts/`. If it can, write the script — and write its test first.

The corollary is that nothing ships on the strength of sounding useful. v3 shipped 32
skills; an audit of 7,077 real prompts over 4.5 months found 26 of them had never been
invoked once, while always-on context cost 22,162 tokens before the user typed anything.
v4 removed everything with no evidence behind it. v5 replaced the skill-count cap with a
measured token budget. v6 added the ship gates below.

| | v3 | now |
|---|---|---|
| Always-on context | ~22,200 tokens | **~6,600** (ceiling 8,000) |
| Hooks wired | 45, 8 of them duplicated | 20 |
| Tests | 0 | 20 files, run by the pre-commit gate |

## What it stops

| Hook | Event | What it stops |
|---|---|---|
| `cc-safety-net.js` | PreToolUse: Bash | `rm -rf ~`, force-push, `git clean -fdx`, bare `git stash pop`. Unwraps `sh -c`/`eval` recursively, resolves `${IFS}` and variable indirection, and decodes base64 payloads rather than matching the surface text. |
| `pre-secrets-block.js` | PreToolUse: Write\|Edit | Writes to `.env`, `*.pem`, `*.key`, `id_rsa`, `credentials.*`, and content carrying live key material. Allows `*.example` and env-var references. Fails **closed**. |
| `secret-read-guard.js` | PreToolUse: Read\|Grep\|Bash | Reading a secret file into the conversation, where it stays for every later request and subagent prompt. Fails **closed**. |
| `ship-gate.js` | PreToolUse: Bash | `git push` / `gh pr create` carrying secrets, `console.log`, `pdb`, `debugger`, `.only` tests, or TODOs with no issue reference. Audits dependencies when a manifest changed. |
| `read-injection-scanner.js` | PostToolUse | Prompt injection in what Read/WebFetch/WebSearch returned. Advisory — by PostToolUse the content is already in context, so it labels rather than blocks. |
| `stop-verify.js` | Stop | The model claiming it is done while ruff/mypy/pytest fail. Resolves tools from the project `.venv`, and scopes to files *this session* edited so a peer session's work is not reported as yours. |
| `block-no-verify.js` | PreToolUse: Bash | `--no-verify` and `-c core.hooksPath=`. Without it every gate here is optional. |
| `write-shrink-guard.js` | PreToolUse: Write | A Write that guts a curated file. |
| `worktree-path-guard.js` | PreToolUse: Edit\|Write | Writes outside the worktree you are working in. |
| `gateguard-pre-edit.js` + `gateguard-track-read.js` | PreToolUse / PostToolUse | Editing a file that has not been read. |

Plus `config-protection.js`, `pre-bash-dev-server-block.js`, `pre-edit-backup.js`,
`post-edit-combined.js`, `pre-compact.js`, `session-start.js`, `session-end.js`,
`loop-runner.js`, `ralph-loop.js`.

## The gates

Four, and each of the first three exists because the previous one could be walked around.

| Gate | Enforces |
|---|---|
| `.git/hooks/pre-commit` | 20 test files + doctor |
| `.git/hooks/commit-msg` | a `fix:`/`feat:` commit carries a regression test |
| `block-no-verify.js` | that the two above cannot be skipped |
| `ship-gate.js` | what leaves: secrets, debug artifacts, untracked TODOs, vulnerable deps |

`ship-gate.js` deliberately does not run the test suite or measure coverage. Those take
minutes, and a gate that takes minutes is a gate people route around — which is exactly
why the third gate had to exist.

## Install

```bash
git clone https://github.com/nassimbf/ftitos-claude-code.git
cd ftitos-claude-code
./install.sh --dry-run   # what would change, and why
./install.sh             # apply; backs up anything it overwrites
node scripts/doctor.js
```

The installer distinguishes `SKIP (identical)` from `WOULD UPDATE (stale)`, so a hook
fixed here actually reaches `~/.claude`, and running it twice is a no-op. It also removes
files it previously installed and no longer ships — and only those, never yours.

**Two skills need a build.** `browse` and `qa` drive a real browser through a compiled
binary that is not committed (~61 MB). If `bun` is available the installer builds it; if
the build fails or `bun` is missing, those two skills are **skipped with a message** rather
than installed pointing at a missing executable. Everything else installs either way, and
`doctor` stays clean. To get them, run `bun install` in `skills/browse/` first, then
re-run `./install.sh`.

`doctor` exits non-zero on duplicate hook registrations, hooks pointing at missing
scripts, repo/install version drift, and an always-on budget over 8,000 tokens.

## Agents

Fourteen. Eight generic — `code-reviewer`, `debugger`, `plan-checker`, `security-auditor`,
`silent-failure-hunter`, `verifier`, `python-reviewer`, `opensource-sanitizer` — and six
matched to the stack this is used on: `fastapi-reviewer`, `database-reviewer`,
`typescript-reviewer`, `react-reviewer`, `rag-pipeline-reviewer`, `tdd-guide`. A generic
reviewer catches generic bugs.

There is no count cap. The always-on token budget decides, measured per file against a
recorded baseline by `scripts/ci/always-on-budget.js`.

## Development

```bash
node tests/run-all.js
node scripts/doctor.js
./install.sh --dry-run
```

Conventions: zero external dependencies, Node built-ins only. Every hook gets a test
written before the script. Removals go to `.archive/`, never `rm`.

## Provenance

Parts are vendored or ported from `open-gsd/gsd-core`, `affaan-m/ecc` and
`garrytan/gstack`, all MIT. See [NOTICE](NOTICE).

[VENDOR-MINING.md](VENDOR-MINING.md) records the evaluation of those and ten other
projects, read from source rather than from their READMEs — including what was
deliberately not taken, and six earlier conclusions that turned out to be wrong.

## License

MIT
