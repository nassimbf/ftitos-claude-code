# Skill Anatomy

Standard structure for skills in ftitos-claude-code. Follow this when creating or reviewing skills.

---

## Directory Structure

```
skills/
  skill-name/
    SKILL.md              # Required: skill definition with frontmatter
    scripts/              # Optional: executable scripts (bash, python)
    data/                 # Optional: CSV, JSON, or other data files
    references/           # Optional: supporting reference docs
    examples.md           # Optional: usage examples (loaded on demand)
```

## SKILL.md Frontmatter (Required)

```yaml
---
name: skill-name-with-hyphens
description: What the skill does in third person. Use when [trigger conditions].
origin: author-or-org          # Required for bundled skills from external repos
---
```

**Rules:**
- `name` must match the directory name, lowercase, hyphen-separated
- `description` starts with what the skill does, then "Use when..." trigger conditions
- `description` max 1024 chars — this is what agents read to decide activation
- Do not put process steps in the description — agents may follow the summary instead of reading the full skill

## Recommended Sections

```markdown
# Skill Title

## Overview
One-two sentences: what this skill does and why it matters.

## When to Use
- Trigger conditions (symptoms, task types)
- When NOT to use (exclusions)

## Process
Step-by-step workflow. Numbered steps or phases.
Code examples where they help. Specific over general.

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| Excuse agents use to skip steps | Why the excuse is wrong |

## Red Flags
- Signs the skill is being violated
- Patterns to watch for during review

## Verification
After completing the skill's process:
- [ ] Exit criterion with evidence requirement
- [ ] Each checkbox must be verifiable (test output, build result, etc.)
```

## Section Purposes

### Common Rationalizations

The most distinctive section. These are excuses agents use to skip important steps, paired with factual rebuttals. Every step that's tempting to skip needs an entry here.

Examples of rationalizations to anticipate:
- "I'll test it all at the end"
- "This is too simple for a spec"
- "I can skip the review for this small change"
- "I already know the answer"

### Red Flags

Observable signs that the skill is being violated. Useful for self-monitoring and code review. These should be specific, not vague.

**Good:** "More than 100 lines of code written without running tests"
**Bad:** "Not following the process properly"

### Verification

Exit criteria that prove the skill's process was completed. Every checkbox should require evidence — not just "I did it" but "here's the proof."

## Writing Principles

1. **Process over knowledge.** Skills are workflows, not reference docs. Steps, not facts.
2. **Specific over general.** "Run `npm test`" beats "verify the tests."
3. **Evidence over assumption.** Every verification checkbox requires proof.
4. **Anti-rationalization.** Every skip-worthy step needs a counter-argument.
5. **Progressive disclosure.** SKILL.md is the entry point. Supporting files are loaded only when needed.
6. **Token-conscious.** Every section must justify its inclusion. If removing it wouldn't change agent behavior, remove it.

## Supporting Files

Create supporting files only when:
- Reference material exceeds 100 lines
- Scripts or data files are needed for the skill to function
- Checklists are long enough to justify a separate file

Keep patterns and guidance inline when under 50 lines.

## Cross-Skill References

Reference other skills by name, don't duplicate content:

```markdown
Follow the `tdd-workflow` skill for writing tests.
If the build breaks, use the `debugging-and-error-recovery` skill.
```

## CI Validation

Every skill is validated by `scripts/ci/validate-skills.js`:
- Directory must contain `SKILL.md`
- SKILL.md must have YAML frontmatter with `name` and `description`
- `name` must match the directory name

Run validation: `node scripts/ci/validate-skills.js`
