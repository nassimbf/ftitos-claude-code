---
name: brainstorming
description: Use before any creative work -- creating features, building components, adding functionality. Explores user intent, requirements, and design before implementation.
origin: ECC
---

# Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design and get user approval.

**HARD GATE**: Do NOT write any code or take implementation actions until you have presented a design and the user has approved it.

## When to Activate

- Starting any new feature or component
- Converting a vague idea into a concrete spec
- When the user describes what they want but hasn't defined how

## Checklist

1. **Explore project context** -- check files, docs, recent commits
2. **Ask clarifying questions** -- one at a time, understand purpose/constraints/success criteria
3. **Propose 2-3 approaches** -- with trade-offs and your recommendation
4. **Present design** -- in sections scaled to complexity, get user approval after each section
5. **Write design doc** -- save to `docs/specs/` and commit
6. **Spec self-review** -- check for placeholders, contradictions, ambiguity, scope
7. **User reviews written spec** -- ask user to review before proceeding
8. **Transition to implementation** -- create implementation plan

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Assess scope: if the request describes multiple independent subsystems, flag immediately
- If too large for a single spec, help decompose into sub-projects
- Ask questions one at a time
- Prefer multiple choice when possible
- Focus on: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Lead with your recommended option and explain why

**Presenting the design:**
- Scale each section to its complexity
- Ask after each section whether it looks right
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify

**Design for isolation and clarity:**
- Break the system into smaller units with one clear purpose
- Each unit should communicate through well-defined interfaces
- Can someone understand what a unit does without reading its internals?

**Working in existing codebases:**
- Explore the current structure before proposing changes
- Follow existing patterns
- Include targeted improvements where existing code has problems that affect the work
- Don't propose unrelated refactoring

## After the Design

**Documentation:**
- Write the validated design to `docs/specs/YYYY-MM-DD-<topic>-design.md`
- Commit the design document to git

**Spec Self-Review:**
1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections? Fix them.
2. **Internal consistency:** Do sections contradict each other?
3. **Scope check:** Focused enough for a single implementation plan?
4. **Ambiguity check:** Could any requirement be interpreted two ways?

**User Review Gate:**
Ask the user to review the written spec before proceeding. Wait for approval.

## Key Principles

- **One question at a time** -- Don't overwhelm
- **Multiple choice preferred** -- Easier to answer
- **YAGNI ruthlessly** -- Remove unnecessary features
- **Explore alternatives** -- Always propose 2-3 approaches
- **Incremental validation** -- Present design, get approval before moving on
