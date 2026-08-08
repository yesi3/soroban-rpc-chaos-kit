# Why This Project

Soroban applications fail at a protocol boundary, not merely an HTTP boundary. A response can be HTTP 200 and valid JSON while reporting an older ledger, skipping a retained event range, replaying a cursor, or carrying a topic in the wrong XDR representation. Soroban RPC Chaos Kit makes those failures deterministic and pairs them with client-side resilience primitives.

## How it differs

- **General HTTP chaos proxies** are excellent for latency, disconnects, and status codes. They generally do not understand JSON-RPC result/error envelopes, method-specific params, ledger fields, event pages, or cursor invariants.
- **Mock Service Worker** intercepts browser/Node requests and is ideal for API fixtures. This kit can use an intercepting adapter in the future, but its scenarios model state across calls and provide Soroban-aware errors, event/XDR helpers, and failover diagnostics.
- **Toxiproxy** manipulates TCP conditions realistically. It complements this project: use Toxiproxy for network degradation and this kit for semantically valid but dangerous RPC behavior.
- **Application-specific mocks** precisely represent one codebase but tend to duplicate fixtures, encode happy-path assumptions, and cannot be shared across SDKs or proxy-driven integration tests. This project supplies reusable transport contracts and fault vocabulary.

The project does not replace those tools; it fills the semantic layer between them and a Stellar application.

## Stellar-specific value

- JSON-RPC method/result/error fidelity rather than generic status substitution.
- Soroban ledger and event-retention boundaries, including safe startup near the latest ledger.
- XDR-encoded event topics instead of silently treating raw strings as RPC filters.
- Monotonic ledger and event-cursor behavior across duplicate, missing, and reordered pages.
- Endpoint failover that preserves causes plus diagnostics that identify regression instead of swallowing it.

## Evidence behind the scenarios

The catalog is informed by recurring failure patterns visible in public ecosystem code, reports, and integration debugging: clients persisting a stale ledger after endpoint failover; event consumers initializing with `startLedger=1` after history was pruned; raw topic strings passed where base64 XDR was required; and broad retry/fallback code swallowing RPC errors until downstream state appeared empty. These examples motivate reproducible tests; they do not claim that every deployment has these defects.

This is an independent open-source project. It does not claim affiliation with, endorsement by, or official status from the Stellar Development Foundation, RPC operators, Drips, or the projects whose public failure patterns informed the design.
