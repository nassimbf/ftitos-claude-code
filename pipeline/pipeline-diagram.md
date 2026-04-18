# Pipeline Diagram

## Full Sprint Pipeline

```mermaid
flowchart TD
    START([Start: /project:sprint validate]) --> VALIDATE

    subgraph AUTO_1["Autonomous Segment 1"]
        VALIDATE[VALIDATE<br/>product-lens + 4 research agents]
        VALIDATE --> PLAN[PLAN<br/>PAUL + Plan Validator + CONTEXT.md]
    end

    PLAN --> GATE1{Gate 1<br/>Plan Approval}
    GATE1 -- "approve" --> BUILD
    GATE1 -- "describe changes" --> PLAN

    subgraph AUTO_2["Autonomous Segment 2"]
        BUILD[BUILD<br/>CCG team-plan + team-exec<br/>parallel Builder agents]
        BUILD --> REVIEW[REVIEW<br/>Review Army 7 specialists<br/>+ Santa Method council]
        REVIEW --> |review gate clear| TEST_AUTO[TEST: Automated<br/>verify-module + browser-qa]
        REVIEW --> |CRITICAL findings| FIX_LOOP[Fix Agent]
        FIX_LOOP --> REVIEW
    end

    TEST_AUTO --> GATE2{Gate 2<br/>UAT}
    GATE2 -- "approved" --> SHIP_CHECK
    GATE2 -- "describe issues" --> FIX_UAT[Fix Agent] --> TEST_AUTO

    SHIP_CHECK[SHIP: Pre-flight checks] --> GATE3{Gate 3<br/>Ship Confirmation}
    GATE3 -- "ship" --> PUSH[Commit + Push + Deploy]
    GATE3 -- "cancel" --> HOLD([Hold])

    subgraph AUTO_3["Autonomous Segment 3"]
        PUSH --> MONITOR[MONITOR<br/>canary-watch + browser-qa]
        MONITOR --> CANARY{Canary<br/>Pass?}
        CANARY -- "pass" --> LIVE([LIVE])
        CANARY -- "fail" --> ROLLBACK[Auto-rollback<br/>to pre-ship tag]
        ROLLBACK --> ISSUE([Log + Create Issue])
    end

    style GATE1 fill:#f9f,stroke:#333
    style GATE2 fill:#f9f,stroke:#333
    style GATE3 fill:#f9f,stroke:#333
    style AUTO_1 fill:#e8f5e9,stroke:#2e7d32
    style AUTO_2 fill:#e8f5e9,stroke:#2e7d32
    style AUTO_3 fill:#e8f5e9,stroke:#2e7d32
```

## Framework Responsibility Map

```mermaid
flowchart LR
    subgraph VALIDATE
        PL[product-lens]
        RA1[Agent: Market]
        RA2[Agent: Competitors]
        RA3[Agent: Stack]
        RA4[Agent: Risks]
    end

    subgraph PLAN
        PAUL[PAUL: /paul:plan]
        PV[Plan Validator Agent]
        CTX[CONTEXT.md Lock]
        TM[BASE: team-matrix assign]
    end

    subgraph BUILD
        CCG_P[CCG: team-plan]
        CCG_E[CCG: team-exec]
        BUILDERS[Builder Agents<br/>fresh context each]
        DIAG[Diagnostic Agent<br/>on test failure]
    end

    subgraph REVIEW
        S1[Security Specialist]
        S2[Performance Specialist]
        S3[Migration Specialist]
        S4[API Contract Specialist]
        S5[Testing Specialist]
        S6[Maintainability Specialist]
        S7[Design/UX Specialist]
        COUNCIL[Santa Method Council<br/>for CRITICAL findings]
        AEGIS[Aegis Audit]
    end

    subgraph TEST
        VM[CCG: verify-module]
        BQA[browser-qa / Playwright]
    end

    subgraph SHIP
        PS[/project:ship]
        CARL_S[CARL: decision log]
        BASE_S[BASE: state update]
        TAG[Git: pre-ship tag]
    end

    subgraph MONITOR
        CW[/canary-watch]
        BQA2[browser-qa smoke]
        LE[/learn-eval]
        SC[/skill-comply]
        FA[failure-analyzer]
    end
```

## Review Army Dispatch

The REVIEW phase dispatches specialists conditionally based on the diff scope:

```mermaid
flowchart TD
    DIFF[diff-scope.sh<br/>analyzes changed files] --> AUTH{Auth or<br/>Backend?}
    DIFF --> FE{Frontend?}
    DIFF --> MIG{Migrations?}
    DIFF --> API{API<br/>changes?}
    DIFF --> SIZE{50+ lines<br/>changed?}

    AUTH -- yes --> SEC[Security Specialist]
    FE -- yes --> PERF[Performance Specialist]
    FE -- yes --> UX[Design/UX Specialist]
    MIG -- yes --> MIGR[Migration Specialist]
    API -- yes --> APIC[API Contract Specialist]
    SIZE -- yes --> TEST_S[Testing Specialist]
    SIZE -- yes --> MAINT[Maintainability Specialist]
    AUTH -- yes --> PERF

    SEC --> FINDINGS{Any CRITICAL?}
    PERF --> FINDINGS
    MIGR --> FINDINGS
    APIC --> FINDINGS
    TEST_S --> FINDINGS
    MAINT --> FINDINGS
    UX --> FINDINGS

    FINDINGS -- yes --> COUNCIL[Santa Method Council<br/>2 independent reviewers]
    FINDINGS -- no --> REPORT[Unified Report]

    COUNCIL --> BOTH_CONFIRM{Both confirm?}
    BOTH_CONFIRM -- yes --> BLOCK[CRITICAL: blocks ship]
    BOTH_CONFIRM -- split --> USER[Escalate to user]
    BOTH_CONFIRM -- both dismiss --> DOWNGRADE[Downgrade to MEDIUM]

    BLOCK --> REPORT
    USER --> REPORT
    DOWNGRADE --> REPORT
```

## Build Wave Execution

```mermaid
flowchart TD
    PLAN_OUT[PAUL Plan] --> DECOMPOSE[/ccg:team-plan<br/>decompose into tasks]
    DECOMPOSE --> W1[Wave 1: Independent tasks<br/>run in parallel]
    W1 --> CHK1[Checkpoint wave_1]
    CHK1 --> W2[Wave 2: Depends on Wave 1<br/>run in parallel]
    W2 --> CHK2[Checkpoint wave_2]
    CHK2 --> WN[Wave N...]
    WN --> CHKN[Checkpoint wave_N]
    CHKN --> COV{Coverage >= 80%?}
    COV -- yes --> DONE[BUILD complete]
    COV -- no --> FILL[Generate targeted tests]
    FILL --> COV

    W1 --> |test fails| DIAG1[Diagnostic Agent]
    DIAG1 --> |fix + retry| W1
    DIAG1 --> |3 failures| BLOCKED1[Mark BLOCKED]
```
