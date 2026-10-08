---
trigger: always_on
---

# Tool routing

Two suites are installed and they overlap on 28 surfaces. **gstack owns the verbs. ECC owns
the nouns.** Anything that *runs a workflow* is gstack. Anything that *knows a language or
framework* is ECC.

## Workflows — use gstack, ignore the ECC equivalent

| job | use | do NOT use |
|---|---|---|
| ship a change | `/ship` | `/pr`, `/prp-pr`, `/prp-commit` |
| review a diff or PR | `/review` | `/code-review`, `/review-pr`, `/orch-review`, `code-reviewer` agent |
| security audit | `/cso` | `/security-scan`, `security-reviewer` agent |
| turn intent into a spec | `/spec` | `/plan-prd`, `/prp-prd`, `intent-driven-development` |
| plan a feature | `/autoplan` (chains the 4 `plan-*-review` skills) | `/plan`, `/prp-plan`, `planner`/`architect` agents |
| debug a failure | `/investigate` | `agent-introspection-debugging` |
| save / restore context | `/context-save`, `/context-restore` | `/save-session`, `/resume-session`, `ck` |
| deploy + watch | `/land-and-deploy`, `/canary` | `production-audit` |
| docs after shipping | `/document-release`, `/document-generate` | `/update-docs`, `doc-updater` agent |

Reason: gstack skills are sequenced and interactive — they stop and ask. The ECC equivalents
are mostly reference documents describing how the job is done.

## Language and framework knowledge — use ECC, gstack has none

- Python: `python-patterns`, `python-testing`, `python-reviewer` agent
- FastAPI: `fastapi-patterns`, `fastapi-reviewer` agent
- Postgres: `postgres-patterns`, `database-migrations`, `database-reviewer` agent
- React / TS: `react-patterns`, `react-testing`, `react-performance`, `vite-patterns`,
  `react-reviewer` + `typescript-reviewer` agents
- Cross-cutting: `error-handling`, `api-design`, `contract-first`, `coding-standards`,
  `tdd-workflow`

## Agents with no equivalent anywhere — prefer these

`silent-failure-hunter` (swallowed errors — the bug class that makes a number engine emit a
wrong figure instead of crashing) · `type-design-analyzer` · `pr-test-analyzer` ·
`spec-miner` · `docs-lookup` (only agent wired to Context7 for current library docs)

## Never relevant here

Any skill, agent, command or rule pack for Go, Rust, Java, Spring, Quarkus, Kotlin, Swift,
C/C++, C#, F#, PHP, Perl, Ruby, Dart, Flutter, Vue, Nuxt, Angular, Laravel, Django, HarmonyOS,
React Native, MySQL, ClickHouse, or Windows desktop. The stack is Python + FastAPI + Postgres
+ React/TypeScript. Do not offer them.

`/ios-*`, `/plan-tune`, `/setup-gbrain`, `/sync-gbrain`, and the GAN loop are out of scope.
