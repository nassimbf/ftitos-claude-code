# Git Workflow

- **Conventional commits**: All commits use the format `type(scope): message`.
  - `feat:` — new feature
  - `fix:` — bug fix
  - `refactor:` — restructuring without behavior change
  - `docs:` — documentation only
  - `test:` — adding or updating tests
  - `chore:` — tooling, deps, config

- **Atomic commits**: One logical change per commit. Never bundle unrelated changes.
- **No secrets in commits**: Scan diff before committing. Never commit `.env`, credentials, or tokens.
- **PR workflow**: All non-trivial changes go through a PR. Review diff before opening. Keep PRs focused — one concern per PR.
- **No force push to main/master**: Always confirm before any destructive git operation.
- **Branch naming**: `feat/description`, `fix/description`, `chore/description`.
