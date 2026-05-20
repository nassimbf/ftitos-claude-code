# Review Council — Adversarial Review Protocol

The Santa Method applied to code review. When any specialist flags a CRITICAL finding, two independent reviewer agents are spawned to validate it before it can block ship.

---

## When Council Activates

Council activates ONLY when a CRITICAL finding is reported by any specialist in the Review Army (Step 1.5) or any prior review step.

HIGH and MEDIUM findings skip council entirely. They are recorded in the report as-is.

---

## Council Protocol

### 1. Spawn Two Independent Reviewer Agents

Dispatch exactly 2 reviewer agents IN PARALLEL (single message, two agent calls).

Each reviewer receives ONLY:
- The CRITICAL finding text (severity, description, confidence score)
- The relevant code snippet or file section where the finding was identified
- The question: "Is this a real issue? Respond with CONFIRM or DISMISS and your reasoning."

Each reviewer does NOT receive:
- The specialist's recommendation or suggested fix
- The other reviewer's assessment
- Any prior review output or session context
- The full diff or unrelated files

Anti-anchoring is mandatory. Reviewers must form independent judgments. Showing one reviewer's output to the other before both have responded invalidates the council.

### 2. Collect Independent Verdicts

Each reviewer responds with one of:
- **CONFIRM** — the finding is a real issue at CRITICAL severity
- **DISMISS** — the finding is a false positive or overstated severity

Each verdict must include brief reasoning (1-3 sentences). Bare verdicts without reasoning are not accepted — re-prompt the reviewer once if reasoning is missing.

### 3. Apply the Decision Matrix

| Reviewer A | Reviewer B | Outcome |
|------------|------------|---------|
| CONFIRM | CONFIRM | Finding remains CRITICAL — blocks ship |
| CONFIRM | DISMISS | Escalate to user — present both arguments |
| DISMISS | CONFIRM | Escalate to user — present both arguments |
| DISMISS | DISMISS | Downgrade to MEDIUM — does not block ship |

### 4. Handle Split Verdicts (Escalate to User)

When verdicts split, present the following to the user:

```
COUNCIL SPLIT — User decision required

Finding: [original CRITICAL finding description]
Evidence: [file:line]

Reviewer A (CONFIRM):
[Reviewer A reasoning]

Reviewer B (DISMISS):
[Reviewer B reasoning]

Does this finding block ship? (yes / no)
```

Wait for the user's explicit response before continuing. Record the user's decision in the final report under the finding.

### 5. Record Council Outcome

In the unified review report, annotate each council-reviewed finding with its outcome:

```
[CRITICAL] Confidence: X/10 — [description]
Evidence: [file:line]
Council: CONFIRMED by 2/2 reviewers — blocks ship
```

or:

```
[MEDIUM — downgraded] Confidence: X/10 — [description]
Evidence: [file:line]
Council: DISMISSED by 2/2 reviewers — does not block ship
Original severity: CRITICAL
```

or:

```
[CRITICAL — user confirmed] Confidence: X/10 — [description]
Evidence: [file:line]
Council: Split verdict — user confirmed CRITICAL
```

---

## Council Scope Rules

- Council applies to: all CRITICAL findings from any source (specialist agents, Step 1, Step 2, Step 3, Step 3.5)
- Council does NOT apply to: HIGH, MEDIUM, or LOW findings
- Council does NOT apply to: findings that are auto-fixable mechanical issues (dead code, magic numbers, missing types) — these are fixed without council regardless of severity
- Council runs BEFORE auto-fix for security findings — do not auto-fix a security issue that council might dismiss

---

## Agent Instructions (Copy-Paste Template for Council Dispatch)

Use this template when spawning council reviewer agents:

```
You are an independent code reviewer. Your only job is to evaluate ONE finding.

Do not search for other issues. Do not provide general feedback. Focus exclusively on this finding.

FINDING:
[paste finding text]

RELEVANT CODE:
[paste code snippet]

Respond with exactly:
- CONFIRM or DISMISS
- 1-3 sentences explaining your reasoning

Nothing else.
```

---

## Why This Exists

Single-agent review systems are susceptible to false positives — a specialist tuned to find security issues will occasionally flag safe patterns as dangerous. The council exists to catch false positives on the highest-stakes findings (CRITICALs) before they block a ship unnecessarily.

The anti-anchoring constraint (reviewers cannot see each other's output) prevents the second reviewer from simply agreeing with the first. Independent verdicts are the only verdicts that count.
