# CLAUDE.md

## What

ftitos-claude-code is an open-source Claude Code configuration harness. It packages agents, skills, rules, hooks, commands, and MCP server configs into an installable bundle that transforms Claude Code from a vanilla assistant into an autonomous engineering system.

## Where

```
ftitos-claude-code/
├── agents/              # 20 specialist agent definitions (.md)
├── skills/              # 40 learned skill directories (each with SKILL.md)
├── rules/
│   ├── common/          # Language-agnostic rules
│   └── python/          # Python-specific rules
├── hooks/
│   ├── hooks.json       # Hook definitions (merged into settings.json)
│   └── scripts/         # Hook implementation scripts
├── commands/            # Slash command definitions
├── brain/               # 4-brain MCP architecture docs
├── frameworks/          # BASE, PAUL, Aegis, CARL framework docs
├── pipeline/            # Sprint pipeline phase docs
├── guides/              # Setup and usage guides
├── examples/            # Example CLAUDE.md files for different project types
├── templates/           # Project manifest and context templates
├── scripts/
│   ├── install-apply.js # Installer
│   ├── uninstall.js     # Uninstaller
│   ├── doctor.js        # Health check
│   ├── diff-scope.sh    # Review Army scope detection
│   └── ci/              # CI validation scripts
├── tests/               # Test suite
├── .github/workflows/   # GitHub Actions CI
├── .claude-plugin/      # Plugin manifest for marketplace
└── install.sh           # Entry point
```

## How

### Development

```bash
# Run tests
node tests/run-all.js

# Run CI validators
node scripts/ci/validate-agents.js
node scripts/ci/validate-skills.js
node scripts/ci/validate-hooks.js

# Test installer (dry run)
./install.sh --dry-run
```

### Conventions

- Zero external dependencies. Node.js built-ins only (fs, path, child_process, os, vm).
- All paths are relative. No hardcoded absolute paths.
- Every agent file must have content (>10 chars).
- Every skill directory must have a SKILL.md with frontmatter (name, description).
- hooks.json must be valid JSON array with each entry having a `type` field.
- All hook scripts must pass syntax validation.

### Adding Content

- **New agent**: Add `agents/agent-name.md` with role description and instructions.
- **New skill**: Create `skills/skill-name/SKILL.md` with frontmatter and instructions.
- **New rule**: Add to `rules/common/` or `rules/python/` as a `.md` file.
- **New hook**: Add entry to `hooks/hooks.json` and implementation to `hooks/scripts/`.

### CI

GitHub Actions runs on every push and PR to main:
1. `node tests/run-all.js` -- All test files
2. `node scripts/ci/validate-agents.js` -- Agent file validation
3. `node scripts/ci/validate-skills.js` -- Skill structure validation
4. `node scripts/ci/validate-hooks.js` -- Hook config and script validation
