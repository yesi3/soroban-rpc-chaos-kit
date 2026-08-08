# Scenario Catalog

All built-in scenarios are deterministic and composable. Use them in-process:

```ts
const rpc = new ChaosEngine(new HttpRpcTransport("http://127.0.0.1:8000"), [
  staleLedger(3),
  rateLimit({ everyNth: 5, retryAfterMs: 1_000 }),
]);
```

Or through the CLI where supported:

```sh
soroban-rpc-chaos proxy --upstream http://127.0.0.1:8000 --port 9000 \
  --scenario rate-limit --config '{"everyNth":5,"retryAfterMs":1000}'
```

## Ledger and retention

### Stale replica

`staleLedger(decrement)` subtracts from `sequence` or `latestLedger`. It reproduces a load balancer repeatedly selecting a lagging RPC replica, exposing clients that mistake a successful response for fresh state.

```ts
new ChaosEngine(upstream, [staleLedger(4)]);
```

### Regressing ledger

`regressingLedger(plan)` replaces ledger values according to a replayable plan and resets to its first value. It models failover from a fresh replica to an older one and tests high-water-mark enforcement.

```ts
new ChaosEngine(upstream, [regressingLedger([500, 501, 497, 502])]);
```

### Retention rejection

`retentionRejection(minimumLedger)` rejects `getEvents` when `startLedger` predates retained history. It reproduces deployments that hard-code `startLedger: 1` after the RPC has pruned old event ledgers.

```ts
new ChaosEngine(upstream, [retentionRejection(4_000_000)]);
```

## Transport and response faults

### Timeout

`timeoutScenario({ delayMs })` delays every request; `{ neverResolve: true }` waits for abort. It reproduces saturated RPCs, stalled connections, and missing client deadlines.

```ts
new ChaosEngine(upstream, [timeoutScenario({ delayMs: 2_500 })]);
// Always pass an AbortSignal when using neverResolve.
```

### Rate limit

`rateLimit({ firstN, everyNth, retryAfterMs })` throws `RpcRateLimitError` predictably. It models shared public RPC quotas and verifies bounded retry plus `Retry-After` handling.

```ts
new ChaosEngine(upstream, [rateLimit({ firstN: 2, everyNth: 10, retryAfterMs: 750 })]);
```

### Malformed response

`malformedResponse(field, mode)` omits a top-level field or replaces it with `"__corrupt__"`. It reproduces partial proxy/cache responses and schema drift, ensuring clients validate before advancing state.

```ts
new ChaosEngine(upstream, [malformedResponse("latestLedger", "omit")]);
```

## Event-stream faults

### Missing events

`missingEvents(everyNth)` drops each selected event. It models incomplete polling windows or indexer gaps and tests reconciliation.

```ts
new ChaosEngine(upstream, [missingEvents(3)]);
```

### Duplicate events

`duplicateEvents(intervalOrPredicate)` repeats matching events. It reproduces overlapping `getEvents` pages and retry replay, testing event-ID idempotency.

```ts
new ChaosEngine(upstream, [duplicateEvents(2)]);
```

### Out-of-order events

`outOfOrderEvents("reverse")` reverses a page. `"shuffle", seed` performs a reproducible shuffle. It models responses assembled across lagging replicas and tests ledger/cursor monotonicity.

```ts
const scenario = outOfOrderEvents("shuffle", 42);
new ChaosEngine(upstream, [scenario]);
```

## Composition guidance

Hooks run in declaration order. Prefer one focused fault per regression test, then add one composition test for interactions. Call `engine.reset()` between examples to reset counters and seeded state. Scenario code must use synthetic data and must never include RPC authorization or real signed transaction payloads.
