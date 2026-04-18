---
name: codebase-onboarding
description: Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conventions, and a starter CLAUDE.md.
origin: ECC
---

# Codebase Onboarding

Systematically analyze an unfamiliar codebase and produce a structured onboarding guide.

## When to Use

- First time opening a project with Claude Code
- Joining a new team or repository
- User asks "help me understand this codebase"
- User asks to generate a CLAUDE.md for a project

## How It Works

### Phase 1: Reconnaissance

Gather raw signals about the project without reading every file:

1. **Package manifest detection** -- package.json, go.mod, Cargo.toml, pyproject.toml, pom.xml, etc.
2. **Framework fingerprinting** -- next.config.*, nuxt.config.*, django settings, flask app factory, etc.
3. **Entry point identification** -- main.*, index.*, app.*, server.*, cmd/, src/main/
4. **Directory structure snapshot** -- Top 2 levels, ignoring node_modules, vendor, .git, dist
5. **Config and tooling detection** -- .eslintrc*, tsconfig.json, Makefile, Dockerfile, CI configs
6. **Test structure detection** -- tests/, __tests__/, *_test.go, *.spec.ts, pytest.ini

### Phase 2: Architecture Mapping

From the reconnaissance data, identify:

- **Tech Stack**: Language(s), framework(s), database(s), build tools, CI/CD
- **Architecture Pattern**: Monolith, monorepo, microservices, or serverless
- **Key Directories**: Map top-level directories to their purpose
- **Data Flow**: Trace one request from entry to response

### Phase 3: Convention Detection

Identify patterns the codebase already follows:

- **Naming Conventions**: File naming, component naming, test file patterns
- **Code Patterns**: Error handling style, dependency injection, async patterns
- **Git Conventions**: Branch naming, commit message style, PR workflow

### Phase 4: Generate Onboarding Artifacts

#### Output 1: Onboarding Guide

```markdown
# Onboarding Guide: [Project Name]

## Overview
[2-3 sentences: what this project does and who it serves]

## Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| ...   | ...       | ...     |

## Architecture
[Diagram or description of how components connect]

## Key Entry Points
- **API routes**: path -- description
- **Database**: path -- data model source of truth

## Common Tasks
- **Run dev server**: `command`
- **Run tests**: `command`
- **Run linter**: `command`
```

#### Output 2: Starter CLAUDE.md

Generate or update a project-specific CLAUDE.md based on detected conventions. If CLAUDE.md already exists, enhance it -- preserve existing instructions.

## Best Practices

1. **Don't read everything** -- use Glob and Grep, not Read on every file
2. **Verify, don't guess** -- trust the code over config if they conflict
3. **Respect existing CLAUDE.md** -- enhance rather than replace
4. **Stay concise** -- scannable in 2 minutes
5. **Flag unknowns** -- "Could not determine test runner" is better than a wrong answer

## Anti-Patterns

- CLAUDE.md longer than 100 lines
- Listing every dependency -- highlight only the ones that shape how you write code
- Describing obvious directory names
- Copying the README -- the onboarding guide adds structural insight the README lacks
