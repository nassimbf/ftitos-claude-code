# Quickstart Guide

Get a fully configured Claude Code workspace running in 5 minutes.

---

## Prerequisites

Before starting, make sure you have:

- **Node.js 18+** — `node --version` should print `v18.x` or higher
- **Claude Code CLI** — installed and authenticated (`claude --version`)
- **git** — any recent version (`git --version`)

If Claude Code is not installed yet:

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

---

## Step 1: Clone and Install (2 min)

```bash
git clone https://github.com/ftitos/ftitos-claude-code.git
cd ftitos-claude-code
./install.sh
```

The installer does three things:

1. Copies agents, skills, rules, hooks, and commands into `~/.claude/`
2. Merges MCP server configs into `~/.claude.json`
3. Runs `npm run doctor` to verify everything landed correctly

When it finishes, you should see:

```
[OK] 20 agents installed
[OK] 40 skills installed
[OK] 12 common rules installed
[OK] 25 hooks installed
[OK] 10 pipeline commands installed
[OK] 4 framework configs installed
```

If any line shows `[FAIL]`, see [Troubleshooting](#troubleshooting) below.

---

## Step 2: Verify the Setup (1 min)

Run the health check:

```bash
npm run doctor
```

This validates:

- All agent files parse correctly
- All skill directories have a `SKILL.md`
- Hook scripts exist and are executable
- MCP servers are reachable
- Required Node version is present

---

## Step 3: Create Your First Project (2 min)

Open Claude Code in a new directory:

```bash
mkdir ~/projects/my-app && cd ~/projects/my-app
git init
claude
```

Inside the Claude Code session:

```
/project:init my-app
```

This creates:

- `.paul/` — phased planning directory
- `.aegis/` — code audit config
- `CONTEXT.md` — project context file for agents
- `CLAUDE.md` — project-level instructions

Then start the pipeline:

```
/project:sprint validate
```

The validate phase checks your project structure and dependencies, then chains automatically into the plan phase. You will be asked to approve the plan at **Gate 1** before any code is written.

---

## Step 4: Verify the Pipeline Works

The sprint pipeline has 7 phases with 3 human gates:

```
VALIDATE (auto) -> PLAN -> [Gate 1: approve] -> BUILD (auto) -> REVIEW (auto) -> TEST -> [Gate 2: approved] -> SHIP -> [Gate 3: ship]
```

After running `/project:sprint validate`:

1. Wait for the plan to appear in `.paul/PLAN.md`
2. Review it and type `approve` to pass Gate 1
3. The build phase starts automatically
4. After build + review + test, you will be asked for UAT at Gate 2
5. Test the product, type `approved`
6. At Gate 3, type `ship` to push

Use `/project:status` at any time to see where you are in the pipeline.

---

## What You Get

After installation, your Claude Code instance has:

| Component | Count | Purpose |
|-----------|-------|---------|
| Agents | 20 | Specialized subagents (architect, debugger, security, TDD, etc.) |
| Skills | 40 | Workflow automations (code review, brain queries, TDD, etc.) |
| Rules | 12+ | Behavioral constraints (coding style, security, git workflow) |
| Hooks | 25 | Automated guardrails (GateGuard, session management) |
| Commands | 10 | Pipeline commands (`/project:init`, `/project:sprint`, etc.) |
| Frameworks | 4 | BASE, PAUL, Aegis, CARL |
| Brains | 4 | Optional MCP memory engines (GBrain, Graphify, GitNexus, Engram) |

---

## Troubleshooting

### `install.sh: Permission denied`

```bash
chmod +x install.sh
./install.sh
```

### Doctor reports missing MCP servers

The 4 brain servers (GBrain, Graphify, GitNexus, Engram) are optional. If they are not installed, doctor will show warnings but not failures. The core system works without them.

The 5 standard MCP servers (context7, memory, sequential-thinking, playwright, deepwiki) are installed via npx and should work out of the box.

### Hooks not firing

Check that hook scripts are executable:

```bash
chmod +x ~/.claude/hooks/scripts/*.sh
```

Then restart the Claude Code session. Hooks only load at session start.

### Agent not found when dispatched

Make sure the agent file is in `~/.claude/agents/` and has the correct filename format:

```
~/.claude/agents/agent-name.md
```

Agent names in dispatch commands must match the filename (without `.md`).

### `npm run doctor` shows Node version error

Upgrade Node to 18+:

```bash
# Using nvm
nvm install 18
nvm use 18

# Using Homebrew (macOS)
brew install node@18
```

---

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand how all components fit together
- Read the [Brain System Guide](./brain-system.md) to set up the 4-brain memory layer
- Read the [Customization Guide](./customization.md) to add your own agents, skills, and rules
- Read the [Hackathon Playbook](./hackathon-playbook.md) for timed build strategies
