---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies.
origin: ECC
---

# Dispatching Parallel Agents

Delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused. They should never inherit your session's context or history -- you construct exactly what they need.

## When to Use

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others)
- Need to understand full system state
- Agents would interfere with each other (editing same files)

## The Pattern

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed

### 3. Dispatch in Parallel

```
Task("Fix agent-tool-abort.test.ts failures")
Task("Fix batch-completion-behavior.test.ts failures")
Task("Fix tool-approval-race-conditions.test.ts failures")
```

### 4. Review and Integrate

- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## Agent Prompt Structure

Good agent prompts are:
1. **Focused** -- One clear problem domain
2. **Self-contained** -- All context needed to understand the problem
3. **Specific about output** -- What should the agent return?

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:
1. Read the test file and understand what each test verifies
2. Identify root cause
3. Fix by replacing arbitrary timeouts with event-based waiting

Do NOT just increase timeouts - find the real issue.
Return: Summary of what you found and what you fixed.
```

## Common Mistakes

- Too broad: "Fix all the tests" -- agent gets lost
- No context: "Fix the race condition" -- agent doesn't know where
- No constraints: Agent might refactor everything
- Vague output: "Fix it" -- you don't know what changed

## Verification

After agents return:
1. Review each summary
2. Check for conflicts (did agents edit same code?)
3. Run full suite
4. Spot check (agents can make systematic errors)
