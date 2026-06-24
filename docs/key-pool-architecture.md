# API Key Looping & Error Handling Architecture

This document maps out the lifecycle and fallback chain for API keys managed by the `KeyPool` class when executing requests (e.g., embeddings or chat completions).

## Architectural Flow Diagram

```mermaid
graph TD
  Start([Start Request Loop]) --> InitAttempted[Initialize attemptedKeys Set]
  InitAttempted --> GetNextKey{Call pool.next}
  
  GetNextKey -- "Key is null OR already attempted" --> FailExhausted[Throw All Keys Exhausted Error]
  
  GetNextKey -- "Valid Key returned" --> AddAttempted[Add key to attemptedKeys]
  
  AddAttempted --> ExecuteRequest[Execute API Request]
  
  ExecuteRequest -- "Success" --> ReturnSuccess([Return Result / Stream Success])
  
  ExecuteRequest -- "Error Catch" --> LogError[Log masked key index and error message]
  
  LogError --> YieldedCheck{Did stream yield any tokens already?}
  
  YieldedCheck -- "Yes" --> ThrowSanitized[Throw Sanitized Upstream Error]
  
  YieldedCheck -- "No" --> InspectStatus{Inspect HTTP Status}
  
  InspectStatus -- "429 Rate Limit" --> MarkRateLimited[Call markRateLimited / Save cooldown to Map]
  InspectStatus -- "401/403 Auth Error" --> MarkDead[Call markDead / Save 24h skip to Map]
  InspectStatus -- "Other Error" --> MarkGeneric[Call markRateLimited / Save 10s cooldown to Map]
  
  MarkRateLimited --> LoopNext[Loop back to pool.next]
  MarkDead --> LoopNext
  MarkGeneric --> LoopNext
  
  LoopNext --> GetNextKey
```

---

## Detailed Component Roles

### 1. Round-Robin Selection
- **`pool.next()`**: Loops through all keys starting from a moving `cursor` index.
- It checks the in-memory `cooldowns` Map. If the current time is greater than the key's cooldown expiry time, it increments the cursor and returns the key.
- If all keys in the pool are currently cooling down, it returns `null`.

### 2. Stream Interruption Guard (`yieldedAny`)
- If the LLM provider has already begun streaming tokens to the client (i.e. `yieldedAny` became `true`), we **cannot** fallback to another key because the HTTP headers and initial chunk payload have already been flushed to the client.
- In this case, we halt the loop and throw a sanitized user-facing error immediately to prevent client-side SSE parsing issues.

### 3. Cooldown & Death Lifecycles
- **Rate Limits (429):** Reads `Retry-After` header when available. Cooldown is mapped to the exact duration + a safety buffer, after which the key is automatically eligible for round-robin again.
- **Auth Failure (401/403):** Flagged as "dead" and cached with a 24-hour cooldown to avoid wasting requests.
