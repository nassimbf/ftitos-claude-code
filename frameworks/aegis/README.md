# Aegis -- Code Audit and Validation

Aegis is a diagnostic audit framework that systematically evaluates a codebase across multiple domains (security, architecture, correctness, compliance). It produces structured findings with severity ratings and actionable remediation steps.

## What It Does

- **Multi-domain auditing**: Evaluates code across architecture, security, correctness, performance, and compliance domains
- **Severity classification**: Findings rated CRITICAL, HIGH, MEDIUM, or LOW
- **Tool integration**: Detects and uses external scanners (SonarQube, Semgrep, Trivy, Gitleaks) when available
- **Phased execution**: Scope definition, signal gathering, domain audits, synthesis, adversarial review, final report
- **Remediation tracking**: Each finding gets an actionable fix recommendation

## Key Files

Each Aegis-initialized project has an `.aegis/` directory:

| File | Purpose |
|------|---------|
| `MANIFEST.md` | Framework version, installed tool detection, initialization timestamp |
| `scope.md` | What is being audited: boundaries, risk profile, focus areas, exit criteria |
| `STATE.md` | Current audit progress: which phases are complete |
| `domain_*.md` | Per-domain findings (e.g., `domain_01_architecture.md`) |
| `threat-model.md` | Threat model if applicable (attack surface, vectors, mitigations) |
| `AEGIS_FINAL_REPORT.md` | Synthesized final report with prioritized findings |

## Commands

| Command | What It Does |
|---------|-------------|
| `/aegis:init` | Initialize Aegis in the current project (creates `.aegis/`, detects tools) |
| `/aegis:audit` | Run a full diagnostic audit across all domains |
| `/aegis:report` | Generate or view the final audit report |
| `/aegis:remediate` | Work through findings and apply fixes |
| `/aegis:status` | Show current audit state and progress |
| `/aegis:validate` | Verify tool installations and configuration |
| `/aegis:guardrails` | Check project against guardrail rules |
| `/aegis:resume` | Resume an interrupted audit |
| `/aegis:transform` | Apply structural transformations based on audit findings |
| `/aegis:playbook` | View or create audit playbooks for specific scenarios |

## Audit Phases

Aegis runs through a structured audit pipeline:

```
Phase 0: Scope        Define what is being audited, risk profile, focus areas
Phase 1: Signals      Automated tool scans (SonarQube, Semgrep, etc.)
Phase 2: Domains      Deep domain-specific audits by specialist agents
Phase 3: Synthesis    Cross-domain correlation, contradiction detection
Phase 4: Adversarial  Devil's advocate challenge of critical findings
Phase 5: Report       Final prioritized report with remediation plan
```

Each phase has explicit gate criteria that must pass before advancing.

## Audit Domains

Aegis evaluates code across these domains:

| Domain | Focus |
|--------|-------|
| Architecture | Layer separation, dependency direction, coupling, cohesion |
| Correctness | Logic errors, edge cases, data integrity, calculation accuracy |
| Security | Auth bypass, injection, secrets exposure, CSRF, XSS, SSRF |
| Performance | N+1 queries, unbounded loops, missing indexes, memory leaks |
| Compliance | Regulatory requirements, standards adherence (domain-specific) |
| Testing | Coverage gaps, flaky tests, assertion quality, mock boundaries |
| Maintainability | File/function size, nesting depth, dead code, naming |
| Data Integrity | Schema consistency, migration safety, referential integrity |

See [domains.md](domains.md) for detailed domain descriptions.

## Finding Format

Each finding follows a standard structure:

```
[SEVERITY] Confidence: X/10 -- <description>
Evidence: <file:line>
Impact: <what breaks or degrades>
Fix: <specific remediation action>
```

Severity levels:
- **CRITICAL**: Blocks ship. Security vulnerabilities, data loss, regulatory violations.
- **HIGH**: Should fix before ship. Performance degradation, missing test coverage on critical paths.
- **MEDIUM**: Fix soon. Code quality, missing edge cases, maintainability concerns.
- **LOW**: Nice to have. Style, minor improvements.

## External Tool Support

Aegis detects and uses these tools when available:

| Tool | Purpose |
|------|---------|
| SonarQube | Static analysis, code smells, coverage |
| Semgrep | Pattern-based security scanning |
| Trivy | Container and dependency vulnerability scanning |
| Gitleaks | Secret detection in git history |
| Checkov | Infrastructure-as-code security |
| Syft | Software bill of materials (SBOM) |
| Grype | Vulnerability matching against SBOM |

If none are installed, Aegis falls back to agent-driven analysis (reading code, running tests, manual inspection).

## Integration with Other Frameworks

- **Sprint pipeline**: Aegis runs during the REVIEW phase. The sprint cannot advance to SHIP if CRITICAL findings exist.
- **PAUL**: Aegis can run during the VERIFY step of a PAUL phase to validate implementation quality.
- **CARL**: Critical architectural decisions discovered during audit should be logged in CARL.
- **Review Army**: The sprint pipeline's Review Army (7 specialist agents) overlaps with Aegis domains. Aegis is the persistent record; Review Army is the per-PR check.

## Setup

1. Navigate to your project directory
2. Run `/aegis:init`
3. Review `MANIFEST.md` to see which tools were detected
4. Run `/aegis:audit` to start a full audit
5. Use `/aegis:remediate` to work through findings
