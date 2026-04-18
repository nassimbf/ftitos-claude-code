---
name: skill-comply
description: Measures whether skills, rules, and agent definitions are actually followed by auto-generating scenarios, running agents, and reporting compliance rates.
origin: ECC
---

# skill-comply: Automated Compliance Measurement

Measures whether coding agents actually follow skills, rules, or agent definitions by:
1. Auto-generating expected behavioral sequences (specs) from any .md file
2. Auto-generating scenarios with decreasing prompt strictness (supportive, neutral, competing)
3. Running `claude -p` and capturing tool call traces
4. Classifying tool calls against spec steps using LLM (not regex)
5. Checking temporal ordering deterministically
6. Generating self-contained reports with spec, prompts, and timelines

## Supported Targets

- **Skills** (`skills/*/SKILL.md`): Workflow skills like search-first, TDD guides
- **Rules** (`rules/*.md`): Mandatory rules like testing.md, security.md
- **Agent definitions** (`agents/*.md`): Whether an agent gets invoked when expected

## When to Activate

- User asks "is this rule actually being followed?"
- After adding new rules/skills, to verify agent compliance
- Periodically as part of quality maintenance

## Usage

```bash
# Full run
uv run python -m scripts.run path/to/rules/testing.md

# Dry run (no cost, spec + scenarios only)
uv run python -m scripts.run --dry-run path/to/skills/search-first/SKILL.md

# Custom models
uv run python -m scripts.run --gen-model haiku --model sonnet <path>
```

## Key Concept: Prompt Independence

Measures whether a skill/rule is followed even when the prompt doesn't explicitly support it.

## Report Contents

Reports are self-contained and include:
1. Expected behavioral sequence (auto-generated spec)
2. Scenario prompts (what was asked at each strictness level)
3. Compliance scores per scenario
4. Tool call timelines with LLM classification labels
