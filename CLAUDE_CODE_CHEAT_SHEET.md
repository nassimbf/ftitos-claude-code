# Claude Code Complete Command Cheat Sheet

**Last Updated:** April 19, 2026
**Version:** 2.0 — Comprehensive Reference
**Organized By:** Functionality, not alphabetically

---

## Table of Contents
1. [🚀 Project Setup & Initialization](#project-setup--initialization)
2. [📋 Project Planning & Architecture](#project-planning--architecture)
3. [💻 Feature Development & Implementation](#feature-development--implementation)
4. [🔍 Code Review & Quality](#code-review--quality)
5. [🔐 Security & Audits](#security--audits)
6. [✅ Testing & Verification](#testing--verification)
7. [🧠 Knowledge & Brain Systems](#knowledge--brain-systems)
8. [📚 Git & Version Control](#git--version-control)
9. [👥 Team & Multi-Model Workflows](#team--multi-model-workflows)
10. [⚙️ Workspace Management](#workspace-management)
11. [📊 Monitoring & Productivity](#monitoring--productivity)
12. [🛠️ Utility & Configuration](#utility--configuration)

---

## 🚀 Project Setup & Initialization

### **`/project:init <project-name>`**
**What it does:** One-shot project bootstrap with ALL 4 frameworks wired (BASE + PAUL + Aegis + CARL)
**When to use:** Starting any new project or significant initiative
**Creates:**
- Project directory structure
- PAUL phased planning (`.paul/PROJECT.md`, `.paul/ROADMAP.md`, `.paul/STATE.md`)
- Aegis audit structure (`.aegis/STATE.md`, `.aegis/MANIFEST.md`)
- Shared project manifest (`.project/manifest.json`)
- Project CLAUDE.md with rules and commands

**Example:** `/project:init football-erp` → fully scaffolded project in `~/projects/football-erp/`

---

### **`/paul:init <project-name>`**
**What it does:** Initialize phased planning framework for a project
**When to use:** If PAUL wasn't auto-initialized by `/project:init`
**Creates:** `.paul/` directory with planning templates

---

### **`/aegis:init [path-to-repo]`**
**What it does:** Initialize AEGIS audit structure in a project
**When to use:** Before running any audit, or to refresh an existing audit
**Features:**
- Creates `.aegis/STATE.md` (tracking audit progress)
- Creates `.aegis/MANIFEST.md` (framework version + tool detection)
- Detects installed tools (SonarQube, Semgrep, Trivy, Gitleaks, Checkov, Syft, Grype)
- Adds `.aegis/` to `.gitignore`

---

### **`/base:scaffold [--full]`**
**What it does:** Initialize workspace infrastructure (BASE framework)
**When to use:** First time setup, or to reset workspace state
**Creates:**
- `.base/workspace.json` — workspace config
- `.base/data/` — data surfaces (projects, decisions, metrics)
- `.base/operator.json` — operator profile
- Essential directories

---

---

## 📋 Project Planning & Architecture

### **`/paul:plan [phase-name]`**
**What it does:** Create or update PLAN.md for the current phase
**When to use:** At the start of each PAUL phase (Research → Planning → Executing → Review → Testing → Shipping → Monitoring)
**Output:** `.paul/phases/[phase-name]/PLAN.md` with acceptance criteria, tasks, and implementation strategy

---

### **`/paul:progress`**
**What it does:** Smart status — shows current phase, remaining work, blockers, next step
**When to use:** Quick check on project health and phase progress
**Info displayed:**
- Current phase + status
- Unfinished tasks
- Blockers
- Next action

---

### **`/paul:discuss [--milestone]`**
**What it does:** Explore and articulate phase vision or milestones
**When to use:** Before finalizing a phase plan, to align on scope and goals
**Output:** Structured discussion of objectives, constraints, risks

---

### **`/paul:apply`**
**What it does:** Execute the current phase (kicks off BUILD or REVIEW based on state)
**When to use:** After `/paul:plan` is approved and you're ready to implement

---

### **`/paul:complete-milestone`**
**What it does:** Mark current milestone as done and advance to next
**When to use:** After finishing a milestone (Research, Planning, etc.)

---

### **`/paul:pause`**
**What it does:** Pause work on a phase (documents why)
**When to use:** When you need to context-switch or defer work

---

### **`/paul:resume`**
**What it does:** Resume paused work and get back into flow
**When to use:** Coming back to a paused project

---

### **`/paul:verify`**
**What it does:** Guide manual UAT testing
**When to use:** Before shipping, to verify product meets spec

---

### **`/paul:audit`**
**What it does:** Enterprise-grade architecture audit of the project
**When to use:** Before major shipping decisions
**Checks:**
- Component dependencies
- Data flow integrity
- Performance bottlenecks
- Security gaps

---

### **`/plan`**
**What it does:** General-purpose planning — understand requirements, assess risks, propose approach
**When to use:** When starting a task and unsure about the approach
**Output:** Detailed written plan for user approval

---

---

## 💻 Feature Development & Implementation

### **`/ccg:feat <feature-description>`**
**What it does:** Intelligent feature development — auto-detects frontend/backend/fullstack, routes to right agents
**When to use:** Implementing any new feature, from idea to shipped
**Flow:**
1. Parse intent (frontend/backend/fullstack)
2. Call ui-ux-designer (if frontend)
3. Call planner (all tasks)
4. Save plan
5. Execute plan with multi-model agents (Codex + Gemini)
6. Ask if user wants code review

---

### **`/ccg:backend <task-description>`**
**What it does:** Backend-focused workflow (research → planning → execution → optimization → review)
**When to use:** Building APIs, databases, microservices, business logic
**Uses:** Codex as primary backend model

---

### **`/ccg:frontend <task-description>`**
**What it does:** Frontend-focused workflow (research → planning → design → execution → optimization → review)
**When to use:** Building pages, components, UI, styling, interactions
**Uses:** Gemini as primary frontend model
**Includes:** ui-ux-designer agent for design before code

---

### **`/ccg:frontend-design <design-task>`**
**What it does:** Pure design work — layouts, components, interactions, visual polish
**When to use:** When you need design before code
**Output:** Component specs, wireframes, design system improvements

---

### **`/ccg:execute [--continue]`**
**What it does:** Multi-model execution of a saved plan
**When to use:** After planning is approved, ready to build
**Options:** `--continue` resumes interrupted execution

---

### **`/ccg:codex-exec`**
**What it does:** Full backend execution with Codex (Claude via code interpreter)
**When to use:** When you want pure backend power without frontend considerations

---

### **`/ccg:team-exec`**
**What it does:** Agent team execution — parallel team workers on independent tasks
**When to use:** Large projects with multiple independent workstreams

---

---

## 🔍 Code Review & Quality

### **`/ccg:review [--staged] [--all]`**
**What it does:** Multi-model code review (Codex + Gemini in parallel, independent verdicts)
**When to use:** PROACTIVELY after writing code or before committing
**Default:** Reviews git diff (unstaged changes)
**Options:**
- `--staged`: review staged changes
- `--all`: review all commits since branch point

**Checks:**
- Security (auth, injection, secrets, crypto)
- Performance (N+1 queries, memory leaks, bundle size)
- Maintainability (function size, nesting, naming)
- API contracts (breaking changes, versioning)
- Testing (coverage gaps, flaky tests)
- UX (accessibility, error states, loading indicators)

---

### **`/code-review`**
**What it does:** General code quality review
**When to use:** After implementing a feature or fix
**Covers:** readability, structure, best practices

---

### **`/ccg:verify-quality`**
**What it does:** Code quality gate — complexity, duplication, naming, function length
**When to use:** Before marking a feature complete
**Checks:**
- Functions > 50 lines
- Files > 800 lines
- Nesting > 3 levels
- Dead code
- DRY violations

---

### **`/ccg:verify-change`**
**What it does:** Change validation gate — analyzes code diff, checks doc sync, assesses impact
**When to use:** Before pushing
**Validates:**
- Documentation is updated
- Tests are added
- Impact scope is understood

---

### **`/ccg:verify-security`**
**What it does:** Security scanning — secrets, injection, CSRF, XSS, SSRF, crypto failures
**When to use:** PROACTIVELY before submitting any auth, payment, or sensitive code
**Severity gates:**
- CRITICAL: blocks ship
- HIGH: requires documentation
- MEDIUM: should fix
- LOW: optional

---

### **`/ccg:verify-module`**
**What it does:** Module completeness gate — structure, docs, code-spec sync
**When to use:** Before shipping a module
**Checks:**
- Directory structure
- README completeness
- Code matches documented API
- Type coverage

---

### **`/python-review`**
**What it does:** Comprehensive Python review (PEP 8, types, idioms, security)
**When to use:** After writing Python code

---

### **`/go-review`**
**What it does:** Comprehensive Go review (idioms, error handling, performance)
**When to use:** After writing Go code

---

### **`/go-test`**
**What it does:** TDD workflow enforcer for Go
**When to use:** Building Go projects with test-first discipline

---

### **`/go-build`**
**What it does:** Fix Go build errors and `go vet` warnings
**When to use:** Build fails

---

### **`/project:review`**
**What it does:** Integrated review pipeline — code review + Aegis audit in one
**When to use:** Major feature complete, before shipping
**Runs:**
1. Multi-model code review
2. Aegis security audit
3. Architecture validation
4. Test coverage check

---

---

## 🔐 Security & Audits

### **`/aegis:audit [--domain <domain>]`**
**What it does:** Comprehensive security/architecture/correctness audit
**When to use:** Before shipping, or periodically to catch new issues
**Domains:**
- `security` — auth, injection, secrets, crypto, XSS, CSRF, SSRF
- `architecture` — dependencies, data flow, performance, scalability
- `correctness` — logic, edge cases, error handling

**Flow:**
1. Phase 0: Context & threat modeling
2. Phase 1: Automated signal gathering (Semgrep, Trivy, etc.)
3. Phase 2: Deep domain audits (security, architecture, correctness)
4. Phase 3: Change risk analysis
5. Phase 4: Adversarial review (Santa Method for CRITICALs)
6. Phase 5: Synthesis & report

---

### **`/aegis:validate`**
**What it does:** Test AEGIS tool installation
**When to use:** After `/aegis:init`, to verify all tools are working
**Checks:** SonarQube, Semgrep, Trivy, Gitleaks, Checkov, Syft, Grype, Git

---

### **`/aegis:remediate [findings]`**
**What it does:** Generate remediation plans for audit findings
**When to use:** After `/aegis:audit` returns findings

---

### **`/aegis:guardrails [code]`**
**What it does:** Validate new code against project security rules
**When to use:** Before committing security-sensitive code

---

### **`/aegis:report [--format <json|html|md>]`**
**What it does:** Generate or view audit report
**When to use:** After audit completes
**Formats:** JSON, HTML, Markdown

---

### **`/aegis:status`**
**What it does:** Show current audit state and progress
**When to use:** Quick check on audit health

---

### **`/aegis:resume`**
**What it does:** Resume an interrupted audit
**When to use:** After pausing an audit or session timeout

---

---

## ✅ Testing & Verification

### **`/ccg:test <test-task>`**
**What it does:** Multi-model test generation (Codex for backend, Gemini for frontend)
**When to use:** After implementation, to auto-generate comprehensive tests
**Output:** Unit tests, integration tests, E2E tests

---

### **`/e2e [test-file]`**
**What it does:** Generate and run end-to-end tests
**When to use:** Testing critical user flows
**Output:** Playwright tests, execution results, artifacts (screenshots, videos)

---

### **`/verify`**
**What it does:** Verification command — run tests, lint, type check
**When to use:** Before committing

---

### **`/test-coverage`**
**What it does:** Run tests and measure coverage
**When to use:** To ensure 80%+ coverage before marking done

---

### **`/tdd`**
**What it does:** Enforce TDD workflow (write test first)
**When to use:** New features, bug fixes
**Forces:** RED → GREEN → IMPROVE cycle

---

### **`/eval`**
**What it does:** Formal evaluation framework for code
**When to use:** Running test suites or benchmarks

---

---

## 🧠 Knowledge & Brain Systems

### **`/brain <query>`**
**What it does:** Unified entry point for all 4 brain systems (GBrain, Graphify, GitNexus, Engram)
**When to use:** Asking questions about people, code structure, decisions, concepts
**Routes to:**
- **GBrain** — "who is X", "tell me about [person/company]"
- **GitNexus** — "how does X work", "what calls Y", "impact of Z"
- **Graphify** — "what concepts relate to X", "architecture overview"
- **Engram** — "what did we decide", "remember when", "last session"

**Examples:**
```
/brain who is Sarah Chen
/brain how does auth work
/brain what will break if I change the router
/brain what did we decide about API versioning
/brain remember that we always validate at boundaries
/brain last session
```

---

### **`/brain search <query>`**
**What it does:** Search across all 4 brain systems in parallel
**When to use:** Unsure which brain system has the answer

---

### **`/brain index`**
**What it does:** Index current project in all brain systems
**When to use:** After major code changes, to keep brain in sync

---

### **`/brain status`**
**What it does:** Show health of all 4 brain systems
**When to use:** Debug why a query isn't finding info

---

### **`/learn`**
**What it does:** Extract reusable patterns from code or decisions
**When to use:** After solving a problem, to capture the pattern for future reuse

---

### **`/learn-eval`**
**What it does:** Extract patterns from test output or task results
**When to use:** Analyzing task execution to derive instincts

---

### **`/instinct-status`**
**What it does:** Show learned instincts (project or global scope)
**When to use:** Check what has been learned so far

---

### **`/instinct-import [file-or-url]`**
**What it does:** Import instincts from file or URL
**When to use:** Sharing patterns across projects

---

### **`/instinct-export`**
**What it does:** Export learned instincts to file
**When to use:** Archiving patterns for reuse

---

### **`/promote [instinct-id]`**
**What it does:** Promote project-scoped instinct to global scope
**When to use:** Instinct is useful across all projects

---

---

## 📚 Git & Version Control

### **`/ccg:commit`**
**What it does:** Smart Git commit — analyzes changes, generates conventional commit message
**When to use:** Ready to commit (always after `/ccg:review`)
**Enforces:**
- Conventional format (feat:, fix:, refactor:, test:, chore:, docs:)
- No secrets in diff
- Atomic changes (one concern per commit)
- Detailed messages

---

### **`/ccg:clean-branches`**
**What it does:** Safe branch cleanup — removes merged or stale branches
**When to use:** Housekeeping, dry-run by default

---

### **`/ccg:rollback`**
**What it does:** Interactive Git rollback — safely revert to historical commits
**When to use:** Need to undo changes

---

### **`/ccg:worktree`**
**What it does:** Manage Git worktrees — isolated copies for concurrent work
**When to use:** Working on multiple branches simultaneously

---

---

## 👥 Team & Multi-Model Workflows

### **`/ccg:team <mode>`**
**What it does:** 8-phase enterprise workflow with agent teams
**When to use:** Large projects with multiple agents working in parallel
**Phases:**
1. Research
2. Ideation
3. Planning
4. Execution
5. Optimization
6. Review
7. Integration
8. Deployment

---

### **`/ccg:team-plan`**
**What it does:** Multi-model planning with agent teams
**When to use:** Complex features requiring coordinated agents

---

### **`/ccg:team-research`**
**What it does:** Parallel research across requirements
**When to use:** Gathering context for large features

---

### **`/ccg:team-exec`**
**What it does:** Parallel execution with independent teams
**When to use:** Multiple workstreams can be built independently

---

### **`/ccg:team-review`**
**What it does:** Parallel code review with team consensus
**When to use:** Cross-team review for major changes

---

### **`/multi-plan`**
**What it does:** Multi-model planning (Codex + Gemini)
**When to use:** Need backend + frontend planning in parallel

---

### **`/multi-execute`**
**What it does:** Multi-model execution (backend + frontend in parallel)
**When to use:** Building fullstack features with no dependencies

---

### **`/multi-backend`**
**What it does:** Backend-focused multi-model collaboration
**When to use:** Complex backend requiring multiple agents

---

### **`/multi-frontend`**
**What it does:** Frontend-focused multi-model collaboration
**When to use:** Complex UI/UX requiring design + code expertise

---

### **`/multi-workflow`**
**What it does:** Full multi-model workflow (research → plan → execute → optimize → review)
**When to use:** Large, complex projects

---

---

## ⚙️ Workspace Management

### **`/base:status`**
**What it does:** Quick workspace health check
**When to use:** Anytime you want to see "how's the workspace?"
**Shows:**
- Projects list + status
- Drift score
- Active milestones

---

### **`/base:pulse`**
**What it does:** Daily workspace health briefing
**When to use:** Morning check-in
**Shows:**
- Workspace vitals
- Active projects
- Blocked items
- Upcoming milestones

---

### **`/base:audit`**
**What it does:** Deep workspace optimization audit
**When to use:** Weekly or monthly maintenance
**Checks:**
- Project structure health
- Decision log consistency
- Framework state integrity
- Rule compliance

---

### **`/base:groom`**
**What it does:** Weekly workspace maintenance — review backlog, track drift
**When to use:** Weekly maintenance cycle

---

### **`/base:audit-claude`**
**What it does:** Audit `.claude/` directory configuration
**When to use:** Debugging configuration issues

---

### **`/base:audit-claude-md`**
**What it does:** Audit CLAUDE.md against CLAUDE.md standards
**When to use:** Ensure CLAUDE.md files are complete and consistent

---

### **`/base:surface-list`**
**What it does:** Show all registered data surfaces
**When to use:** Inventory what data surfaces exist

---

### **`/base:surface-create [name]`**
**What it does:** Create a new data surface (guided setup)
**When to use:** Need new persistent data storage

---

### **`/base:surface-convert [markdown-file]`**
**What it does:** Convert markdown file to data surface
**When to use:** Migrate existing docs to data infrastructure

---

### **`/base:history`**
**What it does:** Workspace evolution timeline
**When to use:** See how workspace has evolved

---

### **`/projects`**
**What it does:** List known projects and their info
**When to use:** See what projects exist and their status

---

### **`/project:status`**
**What it does:** Unified status dashboard across all frameworks
**When to use:** See where project is in sprint pipeline

---

### **`/project:ship`**
**What it does:** Ship with full validation (gates: review + tests pass)
**When to use:** Ready to deploy
**Validations:**
- Code review passes
- Tests pass (80%+ coverage)
- No CRITICAL findings
- Aegis audit clear

---

### **`/project:sprint [phase]`**
**What it does:** Advance sprint phase (VALIDATE → PLAN → BUILD → REVIEW → TEST → SHIP)
**When to use:** Moving between phases

---

---

## 📊 Monitoring & Productivity

### **`/checkpoint`**
**What it does:** Checkpoint the session — save state for recovery
**When to use:** Before risky operations or when you want to save state
**Auto-triggered:** Before context compaction

---

### **`/sessions`**
**What it does:** Show active/completed sessions
**When to use:** See session history

---

### **`/timeline`**
**What it does:** Startup timeline — shows key milestones from startup perspective
**When to use:** Understanding project trajectory

---

### **`/canary-watch`**
**What it does:** Monitor post-deploy health
**When to use:** After shipping to production
**Monitors:**
- Error rates
- Performance metrics
- User-facing issues
- Rollback conditions

---

### **`/browser-qa`**
**What it does:** Automate visual QA with Playwright/Vercel Agent Browser
**When to use:** Before shipping to catch visual bugs
**Tests:**
- Visual regressions
- Responsive design
- Interactions
- Accessibility

---

### **`/retro`**
**What it does:** Weekly retrospective — analyze sprints, improvements, metrics
**When to use:** End of week to review what happened

---

---

## 🛠️ Utility & Configuration

### **`/ccg:plan`**
**What it does:** Multi-model planning with analysis from both Codex and Gemini
**When to use:** Complex planning needing both backend and frontend perspectives

---

### **`/ccg:analyze`**
**What it does:** Multi-model technical analysis (Codex backend + Gemini frontend)
**When to use:** Analyzing existing code or architecture

---

### **`/ccg:debug`**
**What it does:** Multi-model debugging (Codex backend + Gemini frontend)
**When to use:** Diagnosing bugs with full stack visibility

---

### **`/ccg:optimize`**
**What it does:** Multi-model performance optimization
**When to use:** Need both backend and frontend performance tuning

---

### **`/ccg:spec-init`**
**What it does:** Initialize OpenSpec (OPSX) environment
**When to use:** Starting spec-driven development

---

### **`/ccg:spec-plan`**
**What it does:** Multi-model analysis → eliminate ambiguity → create executable plan
**When to use:** Spec-driven workflow

---

### **`/ccg:spec-research`**
**What it does:** Parallel exploration of spec requirements
**When to use:** Understanding all constraints before building

---

### **`/ccg:spec-review`**
**What it does:** Cross-model review of specification
**When to use:** Before building from spec

---

### **`/ccg:spec-impl`**
**What it does:** Build exactly to spec with multi-model coordination
**When to use:** Executing spec-driven implementation

---

### **`/ccg:workflow [--type <workflow-name>]`**
**What it does:** Full multi-model workflow (research → plan → execute → optimize → review)
**When to use:** Complete workflow for complex projects

---

### **`/ccg:context`**
**What it does:** Manage project context — initialize, record decisions, compress
**When to use:** Setting up project context layer

---

### **`/ccg:hi`**
**What it does:** Reject-override — replace last model output with generic alt
**When to use:** Override a response you don't like

---

### **`/ccg:enhance`**
**What it does:** Prompt enhancement — convert vague request to structured requirement
**When to use:** Before planning/building, to clarify ambiguous requirements

---

### **`/ccg:distill`**
**What it does:** Strip designs to their essence
**When to use:** Simplifying overcomplicated designs

---

### **`/ccg:arrange`**
**What it does:** Improve layout, spacing, visual hierarchy
**When to use:** Design refinement

---

### **`/ccg:adapt`**
**What it does:** Adapt designs to work across different contexts
**When to use:** Making designs responsive/flexible

---

### **`/ccg:polish`**
**What it does:** Final quality pass on implementation
**When to use:** Before shipping, refining details

---

### **`/ccg:clarify`**
**What it does:** Improve UX copy, error messages, clarity
**When to use:** Making UI text better for users

---

### **`/ccg:harden`**
**What it does:** Improve interface resilience through error handling
**When to use:** Making UI robust to failures

---

### **`/ccg:normalize`**
**What it does:** Audit and realign UI to design system
**When to use:** Consistency pass

---

### **`/ccg:colorize`**
**What it does:** Add strategic color to features
**When to use:** Visual design refinement

---

### **`/ccg:critique`**
**What it does:** Evaluate design from UX perspective
**When to use:** Design review

---

### **`/ccg:animate`**
**What it does:** Enhance feature with meaningful animations
**When to use:** Polishing interactions

---

### **`/ccg:delight`**
**What it does:** Add moments of joy and personality
**When to use:** Making features feel delightful (only if appropriate)

---

### **`/ccg:overdrive`**
**What it does:** Push interfaces past conventions (safe creative boundaries)
**When to use:** When you want bold, distinctive design

---

### **`/ccg:bolder`**
**What it does:** Amplify safe or boring designs
**When to use:** Making timid designs more confident

---

### **`/ccg:quieter`**
**What it does:** Tone down visually aggressive designs
**When to use:** Calming overactive visual design

---

### **`/ccg:typeset`**
**What it does:** Improve typography (fonts, sizes, spacing)
**When to use:** Typography refinement

---

### **`/ccg:onboard`**
**What it does:** Design and improve onboarding experience
**When to use:** First-time user experience optimization

---

### **`/ccg:scrapling`**
**What it does:** Web scraping and data extraction
**When to use:** Need to extract data from websites

---

### **`/ccg:gen-docs`**
**What it does:** Auto-generate documentation from code
**When to use:** After implementation, to create comprehensive docs

---

### **`/refactor-clean`**
**What it does:** Dead code cleanup and consolidation
**When to use:** Before shipping, to remove unused code

---

### **`/skill-create`**
**What it does:** Analyze git history to extract reusable skills
**When to use:** Codifying common patterns as skills

---

### **`/update-docs`**
**What it does:** Update documentation and codemaps
**When to use:** After significant code changes

---

### **`/update-codemaps`**
**What it does:** Regenerate code maps for documentation
**When to use:** Docs are out of sync with code

---

### **`/generate-tasks`**
**What it does:** Generate task list from spec or requirements
**When to use:** Breaking down large features into tasks

---

### **`/create-prd`**
**What it does:** Generate PRD (Product Requirements Document)
**When to use:** Before planning a new product

---

### **`/orchestrate`**
**What it does:** Run complex orchestration workflows
**When to use:** Coordinating multiple independent systems

---

### **`/pm2`**
**What it does:** PM2 initialization for process management
**When to use:** Managing node.js processes in production

---

### **`/setup-pm`**
**What it does:** Setup PM2 for project
**When to use:** Configuring process management

---

### **`/configure-ecc`**
**What it does:** Interactive installer for Everything Claude Code
**When to use:** Setting up ECC in new environment

---

### **`/claw`**
**What it does:** Start NanoClaw agent REPL
**When to use:** Interactive multi-agent debugging

---

---

## 📋 CCG Design System Commands (Additional Detail)

These commands are part of the CCG design refinement system:

| Command | Purpose | When To Use |
|---------|---------|------------|
| `/ccg:onboard` | Optimize first-time user experience | After MVP, before launch |
| `/ccg:normalize` | Ensure UI consistency with design system | Visual audit |
| `/ccg:clarify` | Improve copy and error messages | UX refinement |
| `/ccg:harden` | Add error states and resilience | Before shipping |
| `/ccg:colorize` | Add strategic color | Design refinement |
| `/ccg:typeset` | Improve typography | Polish phase |
| `/ccg:arrange` | Improve layout and spacing | Layout refinement |
| `/ccg:delight` | Add personality and joy | Final polish (if appropriate) |
| `/ccg:critique` | UX evaluation | Design review |
| `/ccg:animate` | Enhance with animations | Interaction polish |
| `/ccg:adapt` | Make responsive and flexible | Multi-platform support |
| `/ccg:distill` | Simplify overcomplicated designs | Design simplification |
| `/ccg:polish` | Final quality pass | Before shipping |
| `/ccg:quieter` | Tone down aggressive design | Visual balance |
| `/ccg:bolder` | Amplify timid designs | Design confidence |
| `/ccg:overdrive` | Push past conventions | Bold creative direction |

---

## 🔄 Workflow Patterns (How Commands Fit Together)

### **New Feature (Start to Ship)**
```
/project:init [name]              # Bootstrap project
  ↓
/paul:plan                        # Plan the feature
  ↓
/ccg:feat <description>           # Auto-route: plan + execute
  ├─→ ui-ux-designer (if frontend)
  ├─→ planner
  └─→ execute (Codex/Gemini)
  ↓
/ccg:review                       # Code review
  ↓
/ccg:test                         # Generate tests
  ↓
/project:review                   # Integrated review (code + audit)
  ↓
/ccg:commit                       # Commit changes
  ↓
/project:ship                     # Full validation + ship
  ↓
/canary-watch                     # Monitor post-deploy
```

### **Bug Fix**
```
/plan                             # Understand bug
  ↓
/ccg:debug                        # Debug (find root cause)
  ↓
/tdd                              # Write failing test
  ↓
/ccg:execute                      # Implement fix
  ↓
/ccg:review                       # Review
  ↓
/ccg:commit                       # Commit
```

### **Code Review & Quality**
```
/ccg:review                       # Multi-model review
  ↓
/ccg:verify-quality               # Quality gates
  ↓
/ccg:verify-security              # Security gates
  ↓
/ccg:verify-change                # Impact analysis
  ↓
/project:review                   # Full integrated review
```

### **Audit & Hardening**
```
/aegis:init                       # Initialize audit
  ↓
/aegis:validate                   # Verify tools
  ↓
/aegis:audit --domain security    # Security audit
  ↓
/aegis:remediate                  # Fix findings
  ↓
/aegis:report                     # Generate report
```

### **Planning & Architecture**
```
/plan                             # General planning
  ↓
/paul:plan                        # Phase-specific planning
  ↓
/paul:discuss                     # Align on vision
  ↓
/paul:audit                       # Architecture review
  ↓
/paul:apply                       # Execute phase
```

### **Knowledge & Memory**
```
/brain search <query>             # Search all systems
  ↓
/brain index                      # Update index
  ↓
/learn                            # Extract patterns
  ↓
/instinct-status                  # Check what's learned
```

---

## 📊 Command Categories by Frequency

### **Daily Commands** (Use Every Session)
- `/base:status` — workspace health
- `/base:pulse` — quick briefing
- `/brain [query]` — knowledge lookup
- `/paul:progress` — phase status

### **Feature Development** (Use Per Feature)
- `/ccg:feat` — feature dev
- `/paul:plan` — phase plan
- `/ccg:review` — code review
- `/ccg:test` — test generation
- `/ccg:commit` — commit

### **Shipping** (Use Per Release)
- `/project:review` — full review
- `/project:ship` — deployment
- `/aegis:audit` — pre-ship audit
- `/canary-watch` — post-deploy monitoring

### **Maintenance** (Use Weekly/Monthly)
- `/base:groom` — weekly maintenance
- `/base:audit` — monthly deep audit
- `/retro` — weekly retrospective
- `/learn` — pattern extraction

---

## ⚡ Quick Lookup by Use Case

### **I want to...**
| Goal | Use This Command |
|------|------------------|
| Start a new project | `/project:init <name>` |
| Implement a feature | `/ccg:feat <description>` |
| Review my code | `/ccg:review` |
| Run tests | `/ccg:test` or `/e2e` |
| Ship to production | `/project:ship` |
| Check workspace health | `/base:status` or `/base:pulse` |
| Audit security | `/aegis:audit --domain security` |
| Look up code structure | `/brain how does X work` |
| Find a decision | `/brain what did we decide about X` |
| Clean up dead code | `/refactor-clean` |
| Debug a bug | `/ccg:debug` |
| Review decisions | `/brain search <topic>` |
| Fix git issues | `/ccg:clean-branches` or `/ccg:rollback` |
| Plan a feature | `/paul:plan` then `/ccg:feat` |
| Design a feature | `/ccg:frontend-design` then `/ccg:feat` |
| Team coordination | `/ccg:team <mode>` |
| Generate documentation | `/ccg:gen-docs` or `/update-docs` |
| Monitor deployment | `/canary-watch` then `/browser-qa` |
| Weekly review | `/retro` |
| Workspace maintenance | `/base:groom` then `/base:audit` |

---

## 🎓 Pro Tips

1. **Commands are composable** — chain them: `/paul:plan` → `/ccg:feat` → `/ccg:review` → `/ccg:commit` → `/project:ship`

2. **Use `/project:sprint [phase]`** to advance through the full pipeline automatically

3. **`/ccg:review` before every commit** — catches issues early

4. **`/brain` is your knowledge engine** — ask it anything about people, code, decisions, concepts

5. **`/aegis:audit` before shipping** — mandatory security/architecture validation

6. **TDD mandatory** — use `/tdd` to enforce write-test-first

7. **80% coverage minimum** — check with `/test-coverage` before marking done

8. **Multi-model workflows** — for large features, use `/multi-*` to get both Codex and Gemini

9. **Team workflows** — for multiple agents, use `/ccg:team` to orchestrate parallel work

10. **Save your learning** — use `/learn` and `/instinct-*` to capture patterns for future reuse

---

## 🆘 When Something Breaks

| Problem | Command |
|---------|---------|
| Build fails | Use agent: `build-error-resolver` |
| Tests fail | Use agent: `tdd-guide` |
| Type errors | Fix typing, run `verify` |
| Merge conflicts | Resolve manually, test, `/ccg:commit` |
| Security findings | Run `/aegis:remediate` |
| Performance issues | Run `/ccg:optimize` |
| Audit findings | Run `/aegis:remediate` |
| Lost context | Run `/checkpoint` or `/brain last session` |

---

**Remember:** Every command has a purpose. The pipeline is: VALIDATE → PLAN → BUILD → REVIEW → TEST → SHIP → MONITOR. Follow it and you can't go wrong.

