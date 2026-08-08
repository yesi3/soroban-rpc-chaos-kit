# Roadmap

Priorities are proposals, not promises. Security, correctness, and compatibility take precedence over dates.

## 0.1 — Foundation

- Deterministic in-process chaos engine and typed errors
- Local JSON-RPC proxy and diagnostics CLI
- Ledger, retention, timeout, rate-limit, malformed-response, and event scenarios
- Monotonic ledger guard, safe event cursor, retry/failover, and XDR topic helpers
- CI, security policy, architecture/threat-model docs, examples, and package dry-run validation
- Publish the scoped npm package after API/package review (the package is not claimed as published)

## 0.2 — Integrations and observability

- Browser transport/adapter with documented runtime limitations
- Batch JSON-RPC and WebSocket/event-cursor experiments
- Redacted metrics and OpenTelemetry spans
- Authenticated proxy control API and persisted scenario snapshots
- Docker image, reusable GitHub Action, and expanded runnable examples
- Malformed XDR scenarios plus property-based/fuzz testing

## 1.0 — Stable automation surface

- Stable transport, scenario, typed-error, CLI, and configuration contracts
- Versioned scenario DSL with schema validation and deterministic replay
- Compatibility matrix and migration policy
- Signed/provenance-enabled npm release, multi-architecture Docker image, and stable GitHub Action
- Production-quality documentation for extension authors (while retaining test-tool, non-gateway scope)

See `docs/WAVE_ISSUES.md` for independently scoped contribution candidates.
