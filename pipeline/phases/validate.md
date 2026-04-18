# VALIDATE Phase

First phase of the sprint pipeline. Runs a multi-dimensional analysis of the idea before any code is written.

## Purpose

Determine whether the idea is worth building, what the market looks like, who the competitors are, what stack fits, and what risks exist. Produces a go/no-go decision with supporting evidence.

## Entry Criteria

None. This is always the first phase. Start with:

```
/project:sprint validate
```

## What Happens

### Step 1: Product Logic Analysis

Runs `/product-lens` to evaluate:
- MVP definition (what ships in v1, what does not)
- Anti-goals (explicit list of what the product will not do)
- Success metric (one number that determines if this worked)
- Go/no-go recommendation

Output: `PRODUCT-BRIEF.md`

### Step 2: Parallel Research (4 agents, dispatched simultaneously)

| Agent | Focus | Output |
|-------|-------|--------|
| Market Research | Market size, growth rate, target customers, willingness to pay, distribution channels | RESEARCH-market.md |
| Competitor Analysis | Direct/indirect competitors, features, pricing, weaknesses, moats | RESEARCH-competitors.md |
| Stack Recommendation | Tech stack choices with justification, relevant open-source libraries | RESEARCH-stack.md |
| Risk Assessment | Technical risks, market risks, regulatory risks, known failure modes | RESEARCH-risks.md |

### Step 3: Synthesis

All 5 sources (product-lens + 4 research agents) are combined into:
- `PRODUCT-BRIEF.md` -- final go/no-go, MVP scope, anti-goals, success metric
- `RESEARCH.md` -- combined summary of market, competitors, stack, and risks

## Exit Criteria

- `PRODUCT-BRIEF.md` exists with a go/no-go decision
- `RESEARCH.md` exists with research findings

## What Happens Next

Auto-advances to PLAN. No human gate between VALIDATE and PLAN.

## Manifest State

```json
{
  "sprint": {
    "validate": "done"
  }
}
```
