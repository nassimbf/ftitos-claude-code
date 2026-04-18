# FAQ / Troubleshooting

## General

**Q: What is ftitos-claude-code?**
A configuration bundle for Claude Code CLI that adds 20 agents, 40 skills, 15 rules, and 25 lifecycle hooks. It turns Claude Code into an autonomous engineering pipeline: one command (`/project:sprint validate`) runs a project from validation through shipping with only 3 human checkpoints.

**Q: Do I need Claude Pro / Teams / Enterprise?**
You need Claude Code CLI access. Any plan that includes Claude Code works.

**Q: Does this work on Linux / macOS / Windows (WSL)?**
macOS and Linux are supported. Windows requires WSL. Native Windows is not tested.

**Q: Does this work with VS Code / Cursor / terminal?**
It works anywhere Claude Code CLI runs -- terminal, VS Code with the Claude Code extension, Cursor, etc.

---

## Installation

**Q: Will install.sh overwrite my existing Claude Code config?**
It merges into your existing `~/.claude/` directory. Existing agents, skills, and rules are preserved. Conflicts are reported but not overwritten.

**Q: How do I uninstall?**
Run `npm run uninstall` or `node scripts/uninstall.js`. This removes all installed components.

**Q: install.sh failed. What do I do?**
Check Node.js version (18+ required). Run `npm run doctor` to diagnose. If the issue persists, open a bug report at https://github.com/ftitos/ftitos-claude-code/issues with the full error output.

**Q: Can I install only specific components (e.g., just the rules)?**
Not currently. The installer is all-or-nothing. You can manually copy individual directories from `agents/`, `skills/`, `rules/`, or `hooks/` if you need selective installation.

---

## Usage

**Q: How do I start a sprint?**
Run `/project:sprint validate` in Claude Code. The pipeline chains itself from there -- VALIDATE through PLAN, BUILD, REVIEW, TEST, SHIP, and MONITOR with no manual phase triggers.

**Q: What are the 3 gates?**
- Gate 1 (plan approval): review `PLAN.md` + `CONTEXT.md`, type `approve`
- Gate 2 (user acceptance testing): test the product yourself, type `approved`
- Gate 3 (push confirmation): confirm the final push, type `ship`

Everything between gates runs autonomously.

**Q: Do I need to set up all 4 MCP brain servers?**
No. The brain system (GBrain, Graphify, GitNexus, Engram) is optional. The sprint pipeline, agents, skills, rules, and hooks all work without it.

**Q: How do I add my own agents or skills?**
- Agent: create `agents/<name>.md`, run `node scripts/ci/validate-agents.js`
- Skill: create `skills/<name>/SKILL.md` with `name` and `description` frontmatter, run `node scripts/ci/validate-skills.js`

See [Customization](customization.md) for the full process.

---

## Troubleshooting

**Q: `npm run doctor` reports failures. What do I check?**
Doctor validates file existence and format. Read the specific failure message -- it will name the file and what is wrong. Common causes: missing file, malformed JSON in `hooks/hooks.json`, or a skill directory missing its `SKILL.md`.

**Q: GateGuard keeps blocking my edits.**
GateGuard requires a `Read` call on a file before any `Edit` or `Write` to that file. This is by design. Read the file first, then edit. The block clears automatically once the file has been read in the current session.

**Q: Review Army dispatched zero specialists.**
Specialists dispatch based on diff scope detected by `scripts/diff-scope.sh`. If your change is small (under 50 lines) or touches only unrecognized file types, no specialists may match. Run `bash scripts/diff-scope.sh` manually to see what scope flags are set for your current diff.

**Q: A hook script is failing on startup.**
Check that Node.js 18+ is available in your shell path. Hooks run as `node <script>` -- if `node` resolves to an older version, scripts that use modern built-ins will fail. Run `node --version` to confirm.

**Q: The sprint pipeline is stuck after Gate 1.**
Type `approve` (exactly) in response to Claude's plan presentation. The pipeline waits for this exact string. Variations like `approved` or `yes` are not recognized at Gate 1.
