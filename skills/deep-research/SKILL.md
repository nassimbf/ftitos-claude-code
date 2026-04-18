---
name: deep-research
description: Multi-source deep research using web search tools. Searches the web, synthesizes findings, and delivers cited reports with source attribution.
origin: ECC
---

# Deep Research

Produce thorough, cited research reports from multiple web sources.

## When to Activate

- User asks to research any topic in depth
- Competitive analysis, technology evaluation, or market sizing
- Due diligence on companies, investors, or technologies
- Any question requiring synthesis from multiple sources

## Workflow

### Step 1: Understand the Goal
Ask 1-2 quick clarifying questions:
- "What's your goal -- learning, making a decision, or writing something?"
- "Any specific angle or depth you want?"

If the user says "just research it" -- skip ahead with reasonable defaults.

### Step 2: Plan the Research
Break the topic into 3-5 research sub-questions.

### Step 3: Execute Multi-Source Search
For each sub-question, search using available tools:
- Use 2-3 different keyword variations per sub-question
- Mix general and news-focused queries
- Aim for 15-30 unique sources total
- Prioritize: academic, official, reputable news > blogs > forums

### Step 4: Deep-Read Key Sources
Read 3-5 key sources in full for depth. Do not rely only on search snippets.

### Step 5: Synthesize and Write Report

```markdown
# [Topic]: Research Report
*Generated: [date] | Sources: [N] | Confidence: [High/Medium/Low]*

## Executive Summary
[3-5 sentence overview of key findings]

## 1. [First Major Theme]
[Findings with inline citations]

## 2. [Second Major Theme]
...

## Key Takeaways
- [Actionable insight 1]
- [Actionable insight 2]

## Sources
1. [Title](url) -- [one-line summary]
2. ...

## Methodology
Searched [N] queries across web and news. Analyzed [M] sources.
```

### Step 6: Deliver
- **Short topics**: Post the full report in chat
- **Long reports**: Post executive summary + key takeaways, save full report to a file

## Parallel Research with Subagents

For broad topics, use subagents to parallelize:
1. Agent 1: Research sub-questions 1-2
2. Agent 2: Research sub-questions 3-4
3. Agent 3: Research sub-question 5 + cross-cutting themes

Each agent searches, reads sources, and returns findings. Main session synthesizes.

## Quality Rules

1. **Every claim needs a source.** No unsourced assertions.
2. **Cross-reference.** If only one source says it, flag it as unverified.
3. **Recency matters.** Prefer sources from the last 12 months.
4. **Acknowledge gaps.** If you couldn't find good info on a sub-question, say so.
5. **No hallucination.** If you don't know, say "insufficient data found."
6. **Separate fact from inference.** Label estimates and opinions clearly.
