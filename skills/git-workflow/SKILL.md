---
name: git-workflow
description: Git workflow patterns including branching strategies, commit conventions, merge vs rebase, conflict resolution, and collaborative development best practices.
origin: ECC
---

# Git Workflow Patterns

Best practices for Git version control, branching strategies, and collaborative development.

## When to Activate

- Setting up Git workflow for a new project
- Deciding on branching strategy (GitFlow, trunk-based, GitHub flow)
- Writing commit messages and PR descriptions
- Resolving merge conflicts
- Managing releases and version tags
- Onboarding new team members to Git practices

## Branching Strategies

### GitHub Flow (Simple, Recommended for Most)

```
main (protected, always deployable)
  |
  +-- feature/user-auth      -> PR -> merge to main
  +-- feature/payment-flow   -> PR -> merge to main
  +-- fix/login-bug          -> PR -> merge to main
```

**Rules:**
- `main` is always deployable
- Create feature branches from `main`
- Open Pull Request when ready for review
- After approval and CI passes, merge to `main`

### Trunk-Based Development (High-Velocity Teams)

```
main (trunk)
  |
  +-- short-lived feature (1-2 days max)
```

**Rules:**
- Everyone commits to `main` or very short-lived branches
- Feature flags hide incomplete work
- CI must pass before merge

### When to Use Which

| Strategy | Team Size | Release Cadence | Best For |
|----------|-----------|-----------------|----------|
| GitHub Flow | Any | Continuous | SaaS, web apps, startups |
| Trunk-Based | 5+ experienced | Multiple/day | High-velocity teams |
| GitFlow | 10+ | Scheduled | Enterprise, regulated industries |

## Commit Messages

### Conventional Commits Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Use For | Example |
|------|---------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 login` |
| `fix` | Bug fix | `fix(api): handle null response` |
| `docs` | Documentation | `docs(readme): update install instructions` |
| `refactor` | Code refactoring | `refactor(db): extract connection pool` |
| `test` | Adding/updating tests | `test(auth): add token validation tests` |
| `chore` | Maintenance tasks | `chore(deps): update dependencies` |
| `perf` | Performance improvement | `perf(query): add index to users table` |
| `ci` | CI/CD changes | `ci: add PostgreSQL service to test workflow` |

## Merge vs Rebase

### Merge (Preserves History)
```bash
git checkout main
git merge feature/user-auth
```
**Use when:** Merging feature branches into `main`, preserving exact history.

### Rebase (Linear History)
```bash
git checkout feature/user-auth
git rebase main
```
**Use when:** Updating your local feature branch with latest `main`, you're the only contributor.

### When NOT to Rebase
- Branches that have been pushed to a shared repository
- Other people have based work on the branch
- Protected branches (main, develop)

## Pull Request Workflow

### PR Description Template

```markdown
## What
Brief description of what this PR does.

## Why
Explain the motivation and context.

## How
Key implementation details worth highlighting.

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Related issues linked

Closes #123
```

## Conflict Resolution

```bash
# See conflicted files
git status

# Option 1: Manual resolution — edit file, remove conflict markers
# Option 2: Accept one side
git checkout --ours src/auth/login.ts    # Keep main version
git checkout --theirs src/auth/login.ts  # Keep feature version

# After resolving
git add src/auth/login.ts
git commit
```

### Conflict Prevention
- Keep feature branches small and short-lived
- Rebase frequently onto main
- Communicate about shared files
- Use feature flags instead of long-lived branches

## Branch Naming Conventions

```
feature/user-authentication
feature/JIRA-123-payment-integration
fix/login-redirect-loop
hotfix/critical-security-patch
release/1.2.0
experiment/new-caching-strategy
```

## Branch Cleanup

```bash
# Delete local branches that are merged
git branch --merged main | grep -v "^\*\|main" | xargs -n 1 git branch -d

# Delete remote-tracking references for deleted remote branches
git fetch -p
```

## Release Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features, backward compatible
PATCH: Bug fixes, backward compatible
```

### Creating Releases

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

## Anti-Patterns

- Committing directly to main without a PR
- Committing secrets or .env files
- Giant PRs (1000+ lines) — break into smaller, focused PRs
- Vague commit messages ("update", "fix")
- Rewriting public history (force push to shared branches)
- Long-lived feature branches (weeks/months)
- Committing generated files (dist/, node_modules/)
