# Changelog

All notable changes will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project intends to follow Semantic Versioning after its public API stabilizes.

## [0.1.0] - Unreleased

### Added

- `soroban-rpc-chaos scenarios --json` for machine-readable proxy catalog output.
- EditorConfig, `.nvmrc`, and ignore rules for env files and pack tarballs.
- `soroban-rpc-chaos scenarios` command and shared `createProxyScenario` / `PROXY_SCENARIO_NAMES` helpers for the local proxy catalog.
- CLI `--version` from package metadata.
- Deterministic chaos engine with composable request, result, and error hooks.
- Stellar-aware stale/regressing ledger, retention, timeout, rate-limit, malformed response, and event delivery scenarios.
- Typed transport, timeout, retention, rate-limit, malformed response, stale ledger, and failover errors.
- HTTP JSON-RPC transport, local proxy, diagnostics CLI, and Docker packaging.
- Retry, failover, monotonic ledger guard, safe event cursor, and Soroban XDR topic helpers.
- Maintainer governance, security/threat model, architecture, contributor-ready Wave backlog, CI, CodeQL, Dependabot, and templates.

### Fixed

- Ledger guard `reset()` rejects negative or non-integer seeds, matching `observe()`.
- Empty topic symbols and blank RPC URLs fail fast instead of producing unusable requests.
- HTTP transport trims URLs and rejects non-positive timeouts.
- Diagnostics reject invalid sample counts and ledger sequences.
- CLI `--config`, `--port`, `--host`, and `--samples` fail with explicit errors.
- Local proxy `listen()` rejects invalid hosts and ports.
- Retry `attempts` must be a safe integer; `baseDelayMs` cannot be negative.
- Topic decode and contract filters reject blank inputs; symbols are trimmed.
- Event cursor seeding rejects invalid latest-ledger values.

[0.1.0]: https://github.com/yesi3/soroban-rpc-chaos-kit/releases/tag/v0.1.0
