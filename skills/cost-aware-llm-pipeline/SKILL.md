---
name: cost-aware-llm-pipeline
description: Cost optimization patterns for LLM API usage -- model routing by task complexity, budget tracking, retry logic, and prompt caching.
origin: ECC
---

# Cost-Aware LLM Pipeline

Patterns for controlling LLM API costs while maintaining quality.

## When to Activate

- Building applications that call LLM APIs
- Processing batches of items with varying complexity
- Need to stay within a budget for API spend
- Optimizing cost without sacrificing quality on complex tasks

## Core Concepts

### 1. Model Routing by Task Complexity

```python
MODEL_SONNET = "claude-sonnet-4-6"
MODEL_HAIKU = "claude-haiku-4-5-20251001"

_SONNET_TEXT_THRESHOLD = 10_000  # chars
_SONNET_ITEM_THRESHOLD = 30     # items

def select_model(
    text_length: int,
    item_count: int,
    force_model: str | None = None,
) -> str:
    if force_model is not None:
        return force_model
    if text_length >= _SONNET_TEXT_THRESHOLD or item_count >= _SONNET_ITEM_THRESHOLD:
        return MODEL_SONNET
    return MODEL_HAIKU  # 3-4x cheaper
```

### 2. Immutable Cost Tracking

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CostRecord:
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float

@dataclass(frozen=True, slots=True)
class CostTracker:
    budget_limit: float = 1.00
    records: tuple[CostRecord, ...] = ()

    def add(self, record: CostRecord) -> "CostTracker":
        return CostTracker(
            budget_limit=self.budget_limit,
            records=(*self.records, record),
        )

    @property
    def total_cost(self) -> float:
        return sum(r.cost_usd for r in self.records)

    @property
    def over_budget(self) -> bool:
        return self.total_cost > self.budget_limit
```

### 3. Narrow Retry Logic

```python
from anthropic import APIConnectionError, InternalServerError, RateLimitError

_RETRYABLE_ERRORS = (APIConnectionError, RateLimitError, InternalServerError)

def call_with_retry(func, *, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            return func()
        except _RETRYABLE_ERRORS:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
```

### 4. Prompt Caching

```python
messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": user_input},
        ],
    }
]
```

## Best Practices

- Start with the cheapest model and only route up when complexity thresholds are met
- Set explicit budget limits before processing batches
- Log model selection decisions so you can tune thresholds
- Use prompt caching for system prompts over 1024 tokens
- Never retry on authentication or validation errors

## Anti-Patterns

- Using the most expensive model for all requests
- Retrying on all errors (wastes budget on permanent failures)
- Mutating cost tracking state
- Hardcoding model names throughout the codebase
- Ignoring prompt caching for repetitive system prompts
