---
name: product-lens
description: Use this skill to validate the "why" before building, run product diagnostics, and convert vague ideas into specs. Includes YC-style forcing questions, founder review, user journey audit, and feature prioritization.
origin: ECC + gstack
---

# Product Lens — Think Before You Build

## Core Rules (Apply to All Modes)

**Anti-sycophancy is mandatory here.** This skill exists to surface hard truths before you write code. Do not soften findings. Do not hedge recommendations.

- Take a position. State what evidence would change it.
- Push on weak answers. If the user's answer is vague, say so and ask again.
- If the idea has a fundamental problem, state it first — before any path forward.
- Never say "that's a valid approach" or "there are tradeoffs to consider" without immediately naming which approach wins here.

---

## When to Use

- Before starting any feature — validate the "why"
- Weekly product review — are we building the right thing?
- When stuck choosing between features
- Before a launch — sanity check the user journey
- When converting a vague idea into a spec

---

## Mode 1: Office Hours (Forcing Questions)

**Default mode.** Use this before any non-trivial feature or product decision.

Run through these six questions. Do not proceed to code until all six have real answers (not platitudes).

### The Six Questions

**Q1 — Who exactly?**
Not "developers" or "teams." Name a specific type of person with a specific situation.
Push until you get: `[Role] at [context] who [specific pain]`

**Q2 — What's the pain, quantified?**
How often does this happen? What do they do today when this breaks? What does it cost them (time, money, quality)?
Push until you get numbers or a concrete "I currently..." description.

**Q3 — Why now?**
What changed recently that makes this necessary or newly possible? (Technology shift? Market shift? User behavior change? Regulation?)
If the answer is "nothing changed, it's always been a problem" — that is a warning sign. The lack of urgency kills products.

**Q4 — What's the 10-star version?**
Forget constraints. If time and money were unlimited, what would the perfect version look like?
This is not a roadmap item — it's a north star to verify your MVP is pointed in the right direction.

**Q5 — What's the MVP?**
The smallest version that proves the thesis. Not the smallest feature you can ship — the smallest thing that tests whether the core assumption is true.
A/B test, prototype, manual process, or a single workflow count. Full product does not.

**Q6 — What's the anti-goal?**
What are you explicitly NOT building? What would be a tempting scope expansion that you will refuse?
Anti-goals prevent scope creep and sharpen focus.

**Q7 — How do you know it's working?**
One metric. Not "engagement" or "user satisfaction." A number you can check next week.

### Founder Signal Detection

While gathering answers, track these signals:

| Signal | What to look for |
|--------|-----------------|
| Payment evidence | Has anyone paid for this, or committed to pay? |
| Usage proof | Do people use the current workaround repeatedly? |
| Urgency | Do they ask for this unprompted, or only when you suggest it? |
| Specificity | Can they name a specific instance where this cost them? |
| Competitive pressure | Are competitors shipping this? Are users comparing you? |

**Signal count → output tier:**
- 3+ signals including payment evidence: Strong go. Build the MVP now.
- 2–3 signals without payment: Validate payment before full build. Run a pre-sale or commitment.
- 0–1 signals: Stop. The assumption is unvalidated. Run a discovery experiment first.

### Output: `PRODUCT-BRIEF.md`

```markdown
# Product Brief — [Feature/Product Name]

**Date:** [DATE]
**Status:** GO / NO-GO / VALIDATE-FIRST

## The User
[Specific person, not a category]

## The Pain
[Quantified — frequency, cost, current workaround]

## Why Now
[What changed, or honest admission that nothing has — and why you're building anyway]

## 10-Star Version
[Unconstrained ideal state]

## MVP
[Specific, testable, smallest possible version]

## Anti-Goals
[What you will not build, even if asked]

## Success Metric
[One number, checkable within 1 week of launch]

## Founder Signals
[List which signals are present and evidence for each]

## Risks
[Top 2 assumptions that could kill this if wrong]

## Next Step
[Specific action: build, validate payment, run experiment, etc.]
```

---

## Mode 2: Founder Review

Reviews your current project through a founder lens. Run this when you're not sure if you're building the right thing.

### Process

1. **Read the project:** README, CLAUDE.md, package.json, recent commits, open issues.
2. **Infer the thesis:** What is this project actually trying to be? What does success look like for it?
3. **Score PMF signals (0–10):**
   - Usage growth trajectory (commits, users, forks, stars trend)
   - Retention indicators (repeat contributors, return users, continued engagement)
   - Revenue signals (pricing page, billing code, payment integration, paying users)
   - Competitive moat (what is genuinely hard to copy here?)
4. **The 10x question:** What is the single change that would 10x the value of this project?
5. **Flag waste:** What are you building that doesn't contribute to the thesis?

### Output

```
Founder Review: [project name]

Thesis (inferred): [what this is trying to be]

PMF Score: [X/10]
- Usage growth: [finding]
- Retention: [finding]
- Revenue signals: [finding / absent]
- Moat: [finding / absent]

10x move: [specific, actionable]

Building that doesn't matter:
- [item] — [why it doesn't move the needle]
- [item]

Recommendation: [direct call — stay course / pivot / cut scope / validate first]
```

---

## Mode 3: User Journey Audit

Maps the actual user experience as a new user would encounter it.

```
1. Clone/install the product as a brand new user (no prior context)
2. Document every friction point: confusing steps, errors, missing docs, dead ends
3. Time each step
4. Compare to the closest competitor's onboarding
5. Score time-to-value: how many minutes until the user gets their first meaningful result?
6. Recommend: top 3 fixes ranked by friction-removed per effort
```

---

## Mode 4: Feature Prioritization

When you have 10 ideas and need to pick 2.

**ICE Scoring:**
```
Score = Impact (1-5) × Confidence (1-5) ÷ Effort (1-5)
```

1. List all candidate features
2. Score each on ICE
3. Rank by score (higher = more worthy)
4. Apply hard constraints: runway, dependencies, team capacity
5. Output: prioritized list with rationale, and explicit statement of what you're NOT doing

---

## Output

All modes output actionable docs, not essays. Every recommendation has a specific next step. If no specific next step exists, the analysis is incomplete.

## Integration

Pair with:
- `/safety-guard` before running destructive operations during the audit
- `/browser-qa` to verify the user journey audit findings
- `/canary-watch` for post-launch monitoring
- `/retro` to close the loop on whether the product decision was right
