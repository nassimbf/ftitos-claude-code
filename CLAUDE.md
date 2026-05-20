# CLAUDE.md

## What

ftitos-claude-code is an open-source Claude Code configuration harness. It packages agents, skills, rules, hooks, commands, and framework configs into an installable bundle that transforms Claude Code into an autonomous engineering system.

## Where

```
ftitos-claude-code/
├── agents/              # 18 specialist agent definitions
├── agents-ccg/          # 5 CCG team agents
├── skills/              # 24 skill directories (each with SKILL.md)
├── rules/               # 6 common + 10 language-specific rules
│   ├── python/          # 5 Python rules
│   └── typescript/      # 5 TypeScript rules
├── hooks/
│   ├── hooks.json       # Hook definitions (merged into settings.json)
│   └── scripts/         # 8 hook scripts + lib/
├── commands/            # 8 root + 7 project slash commands
├── brain/               # Engram + GitNexus setup guides
├── frameworks/          # BASE, PAUL, Aegis, CARL docs + templates
├── pipeline/            # 9-phase sprint pipeline definitions
├── scripts/
│   ├── install-apply.js # Installer
│   ├── uninstall.js     # Uninstaller
│   ├── doctor.js        # 12-check health validator
│   ├── diff-scope.sh    # Review Army scope detection
│   └── ci/              # CI validation scripts
├── tests/               # Test suite
├── templates/           # Project starter templates
├── examples/            # Example CLAUDE.md files
└── install.sh           # Entry point
```

## How

### Development

```bash
node tests/run-all.js           # Run tests
node scripts/ci/validate-agents.js
node scripts/ci/validate-skills.js
node scripts/ci/validate-hooks.js
./install.sh --dry-run          # Preview install
```

### Conventions

- Zero external dependencies. Node.js built-ins only.
- All paths are relative. No hardcoded absolute paths.
- Every agent file must have content (>10 chars).
- Every skill directory must have a SKILL.md with frontmatter (name, description).
- hooks.json must be valid JSON with each entry having a `type` field.

### Adding Content

- **New agent**: Add `agents/agent-name.md` with role description and instructions.
- **New skill**: Create `skills/skill-name/SKILL.md` with frontmatter and instructions.
- **New rule**: Add to `rules/` as a `.md` file.
- **New hook**: Add entry to `hooks/hooks.json` and script to `hooks/scripts/`.
