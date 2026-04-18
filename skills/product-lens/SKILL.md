---
name: product-lens
description: Validate the "why" before building. Run product diagnostics and convert vague ideas into specs. Includes forcing questions, founder review, user journey audit, and feature prioritization.
origin: ECC + gstack
---

# Product Lens -- Think Before You Build

## Core Rules

**Anti-sycophancy is mandatory here.** This skill exists to surface hard truths before you write code. Do not soften findings.

- Take a position. State what evidence would change it.
- Push on weak answers. If the user's answer is vague, say so and ask again.
- If the idea has a fundamental problem, state it first.

---

## When to Use

- Before starting any feature -- validate the "why"
- Weekly product review -- are we building the right thing?
- When stuck choosing between features
- Before a launch -- sanity check the user journey
- When converting a vague idea into a spec

---

## Mode 1: Office Hours (Forcing Questions)

Run through these questions. Do not proceed to code until all have real answers.

### The Questions

**Q1 -- Who exactly?**
Not "developers" or "teams." Name a specific type of person with a specific situation.

**Q2 -- What's the pain, quantified?**
How often does this happen? What do they do today? What does it cost them?

**Q3 -- Why now?**
What changed recently that makes this necessary or newly possible?

**Q4 -- What's the 10-star version?**
Forget constraints. What would the perfect version look like?

**Q5 -- What's the MVP?**
The smallest version that proves the thesis. Not the smallest feature -- the smallest thing that tests the core assumption.

**Q6 -- What's the anti-goal?**
What are you explicitly NOT building?

**Q7 -- How do you know it's working?**
One metric. A number you can check next week.

### Founder Signal Detection

| Signal | What to look for |
|--------|-----------------|
| Payment evidence | Has anyone paid or committed to pay? |
| Usage proof | Do people use the current workaround repeatedly? |
| Urgency | Do they ask unprompted, or only when suggested? |
| Specificity | Can they name a specific instance where this cost them? |

**Signal count -> output tier:**
- 3+ signals including payment: Strong go. Build the MVP now.
- 2-3 signals without payment: Validate payment before full build.
- 0-1 signals: Stop. Run a discovery experiment first.

---

## Mode 2: Founder Review

Reviews your current project through a founder lens.

1. **Read the project:** README, CLAUDE.md, package.json, recent commits
2. **Infer the thesis:** What is this project actually trying to be?
3. **Score PMF signals (0-10):** Usage growth, retention, revenue signals, competitive moat
4. **The 10x question:** What single change would 10x the value?
5. **Flag waste:** What are you building that doesn't contribute to the thesis?

---

## Mode 3: User Journey Audit

```
1. Clone/install as a brand new user (no prior context)
2. Document every friction point
3. Time each step
4. Compare to closest competitor's onboarding
5. Score time-to-value
6. Recommend: top 3 fixes ranked by friction-removed per effort
```

---

## Mode 4: Feature Prioritization

**ICE Scoring:**
```
Score = Impact (1-5) x Confidence (1-5) / Effort (1-5)
```

1. List all candidate features
2. Score each on ICE
3. Rank by score
4. Apply hard constraints: runway, dependencies, team capacity
5. Output: prioritized list with rationale

---

## Output

All modes output actionable docs, not essays. Every recommendation has a specific next step.
