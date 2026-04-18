# Contributing

We welcome contributions from the community. Issues and pull requests are the best way to report bugs, propose features, or suggest improvements.

## How to Contribute

1. **Report bugs**: Open an [issue on GitHub](https://github.com/ftitos/ftitos-claude-code/issues) with a clear title and description.
2. **Suggest features**: File an issue tagged `enhancement` describing the use case and expected behavior.
3. **Submit PRs**: Fork the repo, create a feature branch, and submit a PR with a focused description. One concern per PR.

All contributions must pass the validation suite before merge.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/ftitos/ftitos-claude-code.git
cd ftitos-claude-code

# Install (Node 18+ required)
./install.sh

# Verify installation
npm run doctor

# Run full test suite
npm test
```

## Adding Components

### Adding an Agent

1. Create `agents/<agent-name>.md` with:
   - Agent name and role description
   - What the agent checks or accomplishes
   - When it should be dispatched (conditions)
   - Checklist of responsibilities
2. Run `npm run validate:agents` to verify.

### Adding a Skill

1. Create `skills/<skill-name>/SKILL.md` with:
   - YAML frontmatter: `name`, `description`
   - Detailed instructions and examples
   - Any prerequisites or assumptions
2. Run `npm run validate:skills` to verify.

### Adding a Rule

1. Create a `.md` file in:
   - `rules/common/` for language-agnostic rules
   - `rules/<language>/` for language-specific rules (e.g., `rules/python/`)
2. Use this format:
   - Heading (rule topic)
   - Bullet-point checklist or examples
   - Severity mapping (CRITICAL/HIGH/MEDIUM) where applicable

### Adding a Hook

1. Add the hook script to `hooks/scripts/<hook-name>.js`.
2. Register it in `hooks/hooks.json` with:
   - `type` -- lifecycle event (PreToolUse, PostToolUse, SessionStart, etc.)
   - `pattern` -- condition or regex match
   - `command` -- path to script or inline script
3. Run `npm run validate:hooks` to verify.

## Running Tests and Validators

```bash
npm test                    # Full test suite
npm run validate:agents     # Agent file validation
npm run validate:skills     # Skill structure and frontmatter
npm run validate:hooks      # Hook config and script syntax
./install.sh --dry-run      # Test installer without writing files
```

All tests must pass before opening a PR.

## Pull Request Process

1. **Create a feature branch**: Use `feat/`, `fix/`, `docs/`, or `chore/` prefixes.
   ```bash
   git checkout -b feat/new-agent-name
   git checkout -b fix/validation-issue
   ```

2. **Make your changes**: Follow the conventions in the relevant section above.

3. **Validate your work**:
   - Run the relevant validator(s) for your changes
   - Run the full test suite: `npm test`
   - Verify installer works: `./install.sh --dry-run`

4. **Commit with conventional commits**:
   ```bash
   git commit -m "feat: add new-agent-name agent"
   git commit -m "fix: validation error in skill-name"
   git commit -m "docs: update hook documentation"
   ```

5. **Write a clear PR description** explaining what, why, and how.

6. **Push and open the PR**: Link any related issues. One concern per PR.

## Code Style

- **Zero external dependencies**: Use only Node.js built-ins (fs, path, child_process, os, vm).
- **Relative paths**: All file paths must be relative. Never hardcode absolute paths.
- **Content requirement**: Every file must have meaningful content (>10 characters). No empty stubs.
- **Formatting**: Keep JSON valid, markdown clean. No trailing whitespace.
- **Naming**: Descriptive names. Avoid abbreviations except universally understood ones (id, url, etc.).

## Reporting Bugs

Use [GitHub Issues](https://github.com/ftitos/ftitos-claude-code/issues) with:
- **Title**: Clear, one-line summary
- **Environment**: Node version, Claude Code version, OS
- **Steps to reproduce**: Exact commands and conditions
- **Expected vs actual**: What you expected; what happened instead
- **Logs or error output**: Paste relevant error messages or validator output

## Questions?

Check the [guides](guides/):
- [Quickstart](guides/quickstart.md) -- Get running in 5 minutes
- [Architecture](guides/architecture.md) -- System design and component relationships
- [Customization](guides/customization.md) -- Adding agents, skills, rules, hooks
- [FAQ](guides/faq.md) -- Common questions and troubleshooting
