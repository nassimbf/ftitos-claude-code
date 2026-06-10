# FACTORY BLUEPRINT — ftitos-claude-code v3

*Research date: 2026-06-09 · 7 parallel agents (2 local inventory + 5 internet sweep) · All GitHub stars/push-dates verified live via api.github.com — nothing reported from memory or search snippets · Confidence: High*

---

## 0. The Verdict

The "one repo to rule them all" is not built by installing more components. The sweep's unanimous finding — from OpenAI's harness-engineering post, Anthropic's engineering blog, Spotify's production fleet (1,500+ merged AI PRs), Trail of Bits, and Yegge's Gas Town — is one equation:

> **factory throughput = parallel lanes × loop reliability × verification strength ÷ human attention**

You already own more harness surface than almost anyone (46 agents, 95 skills, 51 commands, 15 hooks, 4 frameworks, 4 memory engines). The winning move is **consolidate + adopt 4 things + absorb ~12 patterns + cut aggressively**, organized into 8 layers below.

The single most-repeated warning across all sources: *the same model writing code, tests, and review converges on shared blind spots.* Every credible 2026 system separates the verifier's context from the builder's (blind judges, holdout scenarios, write-tool-less reviewers, deterministic finals). That is the moat. A3's deterministic pipeline + number fence already embodies this philosophy — the factory generalizes it.

---

## 1. The Verified Landscape (2026-06-09)

| Repo | Stars | Pushed | Verdict |
|---|---|---|---|
| obra/superpowers | 222,348 | today | Already absorbed — track upstream |
| affaan-m/ECC | 211,813 | today | Targeted backports only |
| anthropics/skills | 148,544 | today | Skip content; absorb spec/ for frontmatter compat |
| anthropics/claude-code (native CLI v2.1.170) | 131,322 | today | **ADOPT natives: /goal, /loop, Workflows, agent teams** |
| github/spec-kit v0.10.0 | 110,814 | today | Keep derived pieces (/project:analyze); don't re-adopt wholesale |
| thedotmack/claude-mem | 81,475 | today | Absorb patterns into Engram; do NOT install |
| ruvnet/ruflo (claude-flow) | 58,696 | today | **SKIP** — stars ≠ practitioner trust |
| Fission-AI/OpenSpec | 53,826 | today | **ADOPT for A3** (brownfield delta-specs) |
| vercel-labs/agent-browser | 35,673 | recent | **ADOPT** (UI verification, ~82% less context than Playwright MCP) |
| anthropics/claude-plugins-official | 29,739 | today | **ADOPT: ralph-loop + security-guidance**; absorb hookify pattern |
| getzep/graphiti | 27,223 | today | Absorb bi-temporal edges into memory merge |
| eyaltoledano/claude-task-master | 27,359 | Apr 28 | Skip (slowing; PAUL+Beads cover it) |
| **gastownhall/beads** | **24,438** | today | **ADOPT — strongest single recommendation** |
| gastownhall/gastown (Gas Town) | 15,821 | today | Absorb: Refinery merge queue, Seance, Witness/Deacon |
| frankbria/ralph-claude-code | 9,283 | today | Absorb: dual-exit gate, circuit breaker, rate-limit handling |
| trailofbits/skills (mutation skill) | 5,620 | recent | Absorb mutation-campaign design |
| anthropics/claude-code-security-review | 5,148 | Feb | Adopt as CI action |
| SWE-agent/mini-swe-agent | 5,050 | today | Pattern reference (minimal loop) |
| cc-sdd (Kiro-style EARS specs) | 3,460 | May | Absorb EARS requirement syntax |
| harbor-framework/harbor | 2,378 | today | Adopt for harness evals |
| mikeyobrien/ralph-orchestrator | 2,929 | May | Absorb hat-roles + LOOP_COMPLETE |
| kenryu42/cc-safety-net | 1,385 | recent | **ADOPT** (semantic destructive-command guard) |
| AnandChowdhary/continuous-claude | 1,350 | recent | Absorb: CI-as-fitness, relay notes, completion vote |
| boxed/mutmut | 1,316 | recent | **ADOPT** (Python mutation gate) |
| umputun/ralphex | 1,252 | today | Absorb: fresh-context loop, validation-commands-in-plan |
| gastownhall/gascity | 894 | today | Watch — re-evaluate at GA (audit-trail framing = A3 market) |
| SWE-bench/SWE-smith | 671 | recent | Adopt to auto-generate A3 eval tasks |
| mmaaz-git/agentic-pbt | 68 | Nov 25 | Absorb the Anthropic red-team PBT recipe |

Debunked/confirmed-tiny from prior session's report: goal-cc 6★, cc-safe-setup 46★, claude-loop 1★, ralph-mcp 2★ — patterns only, never installs. Frozen/commercialized tier (vibe-kanban, crystal→Nimbalyst, claude-squad): skip.

---

## 2. The 8-Layer Architecture (ftitos-claude-code v3)

### L0 — Doctrine (the repo IS the harness)
From OpenAI (~1M LOC, 0 manually-written lines) + Anthropic + HumanLayer (ETH data: bloated agentfiles *hurt*):
- `AGENTS.md`/`CLAUDE.md` = **table of contents, ≤100 lines**, pointing into `docs/` (design-docs, exec-plans/{active,completed}, product-specs, generated schemas, core-beliefs, golden principles).
- Plans are first-class versioned artifacts. Anything not in the repo "effectively doesn't exist" to an agent.
- Doc-freshness CI + recurring doc-gardening agent.
- Per line of CLAUDE.md: "Would removing this cause mistakes? If not, cut it."

### L1 — Work Ledger: Beads
`bd init --stealth` per project. Hash-IDs merge-safely across worktrees; `bd update --claim` = atomic claim (kills multi-agent races); `bd ready` = dependency-aware next-work; `bd remember`/`bd prime` = intent memory; semantic decay compacts closed work. **PAUL stays as the planning methodology but emits beads instead of markdown phases — this ends plan-file rot.** Yegge's framing: git is the What/Where/How; beads are the Why.

### L2 — Loop Engine (two modes, both with engineered stop conditions)
- **In-session**: native `/goal` (separate Haiku judges completion — strictly stronger than self-declared "done") + official ralph-loop plugin (Stop-hook re-feed, `--max-iterations`, completion-promise).
- **Overnight/fresh-context** (Huntley doctrine: one task per loop, identical context allocation each iteration, filesystem as shared state): a thin runner skill porting verified patterns —
  - Dual exit gate: completion indicators AND explicit `EXIT_SIGNAL: true` (frankbria)
  - Circuit breaker: force-exit after 5 consecutive "complete" signals (frankbria)
  - Error gate: 3 retries → log to `pending_for_human.md`, move on (yurukusa 108-hour taxonomy — "would have prevented 70% of incidents")
  - Validation commands embedded in plan files = machine-verifiable per-task gate (ralphex)
  - Relay-race notes: `SHARED_TASK_NOTES.md` — "make meaningful progress on one thing, leave notes" (continuous-claude)
  - Resume-Here block in one canonical state file (goal-ledger)
  - Triple budget: max-iterations + `--max-budget-usd` + wall-clock expiry; spawn budget for subagent recursion
  - Stagnation design: ticket-queue loop — next action always defined by queue state (= Beads `bd ready`)

### L3 — Verification Stack (the moat; ordered, silent-success)
Spotify production law: **deterministic verifiers first, LLM judge last; judge sees only (diff, original task); success is silent, failure surfaces** (their judge vetoes ~25%, agents self-correct ~50% of vetoes — track veto-rate as fleet KPI).
- **Gate 0 deterministic**: ruff → mypy → pytest via Stop hook; swallow passing output, surface only errors, exit-2 re-engagement.
- **Gate 1 mutation** (test-quality oracle): mutmut with Trail-of-Bits campaign design — tiered mutants (revert/raise > comment-out > operator swaps), two-phase (targeted tests first, full suite on survivors), DB-backed triage, **skeptical-agent rule**: surviving mutant → agent must get external confirmation before writing the killing test (else you crystallize bugs into the suite).
- **Gate 2 property-based**: Anthropic red-team agentic-PBT recipe — infer invariants, write Hypothesis tests, reflect "real bug or bad test?" A3's Decimal/reconciliation invariants (Anlagenspiegel must reconcile exactly) are the ideal target.
- **Gate 3 blind judge**: holdout acceptance scenarios in a path the builder is **permission-denied from reading** (uglycode pattern); reviewer agents whose tool manifest **excludes Edit/Write** (wow-harness); evidence files (`progress.json`) over self-report; convergence loop with stuck-detection.
- **Gate 4 UI**: agent-browser smoke loop post-build; Playwright planner/generator/healer for the persistent E2E suite.
- Keep Review Army + Council (already strong, confidence-gated, anti-anchoring) — wired *after* deterministic gates.

### L4 — Fleet Orchestration
- Native **agent teams** (`TeammateIdle`/`TaskCreated`/`TaskCompleted` quality-gate hooks) + native **Workflows** (saved to `.claude/workflows/`, 16 concurrent agents) replace custom dispatch machinery.
- **Refinery pattern** (Gas Town): one dedicated merge-queue agent serializes worktree merges with verification gates — the answer to "agents in a monkey knife fight over rebasing."
- **Witness/Deacon pattern**: watchdog detecting stuck agents + heartbeat nudges.
- Redundancy rule (Gas City): never run an unattended process on a single agent — ≥2 with review.
- Subagents are **context firewalls and cost routers, not personas** (HumanLayer: persona subagents "don't work"); condensed returns with `filepath:line` citations; artifacts to filesystem, references passed back.

### L5 — Memory: consolidate 4 → 3 + Beads
- **Keep GitNexus** (no stronger competitor for call-graph/impact).
- **Upgrade Engram** with claude-mem's progressive-disclosure (index → timeline → full fetch, ~10x token savings), citation IDs, and Gas Town's **Seance** (interrogate dead predecessors' sessions via event logs). Closes 100% of the gap to claude-mem (81k★) without a 5th engine.
- **Merge Graphify + GBrain** into one pgvector GraphRAG store, adopting graphiti's **bi-temporal edges** (valid_at/invalid_at) — the one state-of-the-art capability the stack lacks.
- **Beads** = the orthogonal Why-ledger none of the engines is.

### L6 — Safety
- **cc-safety-net** (semantic command analysis: recursive wrapper unwrapping, interpreter one-liner detection — survives the flag-reorder/sh-c bypasses that kill plain deny rules; runs PreToolUse before the permission system).
- **Payload-verified config audit** (Boucle pattern): fire live test payloads (`rm -rf /`, `git push --force`) to prove hooks actually block; `stderr` + `exit 2` is the reliable hard-block.
- Official **security-guidance** plugin (3-layer: regex PreToolUse → LLM diff review pre-response → agentic commit review tracing cross-file data flow).
- Migrate hooks.json toward **hookify-style markdown hooks** (cheaper to maintain at 15-hook scale).
- Monitoring: `CLAUDE_CODE_ENABLE_TELEMETRY=1` → OTel; alert rule: 4 identical tool calls in 6 spans = retry loop. `/cost` is a meter, not a brake.
- Isolation doctrine (Huntley): never bare `--dangerously-skip-permissions` on a host with credentials — worktree/Docker blast-radius containment.

### L7 — Specs
- **OpenSpec** for A3 (delta-specs against a living source-of-truth; brownfield-native; ~⅓ the markdown of spec-kit) — the contract the blind judge verifies against.
- Keep spec-kit-derived `/project:analyze` (severity-tiered cross-artifact consistency).
- **EARS syntax** (cc-sdd) for acceptance criteria — most machine-checkable requirement format.

### L8 — Harness Evals + the Hashimoto Rule
- ~20 golden tasks (prompt + repo state + deterministic `checks.py`), Harbor-style; SWE-smith to auto-generate regression tasks from A3 itself; 5-run protocol; judge calibrated against human labels; CI gate on >0.3 regression vs baseline.
- **Hashimoto rule** (the operating principle of the whole factory): *every observed agent failure becomes a permanent engineered fix — a sign, lint, hook, or tool — such that the agent never makes that mistake again.* Grow the harness only from observed failures; throw away configuration that doesn't earn its tokens.
- Scheduled entropy GC: doc-gardening, slop-scanning vs golden principles, small auto-mergeable refactor PRs (OpenAI's continuous debt paydown).

---

## 3. Cuts (the factory gets faster by subtraction)

| Cut | Why |
|---|---|
| Custom `/go` autonomous chaining | Native `/goal` evaluator (separate-model completion) is strictly stronger |
| Third-party goal/loop installs (goal-cc, goal-mode, ralph-mcp, etc.) | Superseded by natives; 0–46★ |
| ruflo/claude-flow | 58.7k★ but practitioner consensus: hype > capability |
| claude-mem install | 90% congruent with Engram; absorb patterns only |
| Worktree UI managers (vibe-kanban, claude-squad, crystal) | Native agent teams + EnterWorktree + Refinery pattern cover it |
| GBrain + Graphify as separate engines | Merge (double ingestion, divergent answers today) |
| 3 duplicate skills (receiving/requesting-code-review, writing-skills in active+archive) | Dedupe |
| 206M session/debug cache | 60-day retention policy (saves 100–140M) |
| BASE groom debt | Run /base:groom (never run since April 1) |

---

## 4. Roadmap

**Phase 0 — Today (installs, ~1h):** ralph-loop + security-guidance plugins · cc-safety-net · `bd init --stealth` in A3 · cache retention policy · dedupe skills.

**Phase 1 — Week 1 (verification moat, A3-first):** silent-success Stop hook (ruff/mypy/pytest) · mutmut with ToB two-phase config · agentic-PBT command over `saa.engine.areas.fixed_assets` · blind-judge gate with permission-denied holdout scenarios · veto-rate logging.

**Phase 2 — Week 2 (loop engine + doctrine):** fresh-context loop runner skill (dual exit gate, circuit breaker, error-gate, triple budget, relay notes) · AGENTS.md-as-ToC + docs/ layout in A3 · OpenSpec init.

**Phase 3 — Weeks 3–4 (fleet + memory):** Refinery merge-queue agent for multi-worktree builds · Witness watchdog · agent-teams pilot on parallel FA specialists · Engram upgrades (timeline, seance, citations) · Graphify+GBrain merge with temporal edges · harness eval set (20 golden tasks).

**Continuous:** entropy GC loops · Hashimoto rule on every failure · quarterly re-check of Gas City (GA) and ECC upstream.

**Then:** package all of it as ftitos-claude-code v3 — the distribution becomes the productized factory.

---

## 5. Economics & Philosophy Notes

- Multi-agent ≈ 15× chat-level tokens (Anthropic); Gas Town field test ran ~$100/hr and merged a PR with failing tests — **throughput-over-precision is the wrong philosophy for A3**. Your factory is the opposite bet: verification supremacy ("Light Factory"), which happens to be exactly Gas City's enterprise pitch ("bring AI into my company and pass an audit trail") — i.e., your factory architecture and A3's product market are the same thesis.
- Human attention is the scarce resource. The compounding asset is not generated code but checked-in scaffolding — specs, plans, gates, lints, evals — "that makes the next million lines cheaper than the last" (OpenAI).
- June 15, 2026 billing note: Agent SDK / `claude -p` moves to a separate credit pool for subscription users (documented in ralphex README) — factor into overnight-run planning.

## Sources (primary)
OpenAI harness-engineering (openai.com/index/harness-engineering) · ghuntley.com/ralph + /loop · steve-yegge.medium.com (Gas Town, Gas City) · anthropic.com/engineering (best-practices, tools-for-agents, context-engineering, multi-agent-research) · engineering.atspotify.com Honk parts 1–4 · blog.trailofbits.com mutation-testing-for-the-agentic-era · red.anthropic.com property-based-testing · humanlayer.dev skill-issue · dolthub.com a-day-in-gas-town · all repos verified via api.github.com 2026-06-09.
