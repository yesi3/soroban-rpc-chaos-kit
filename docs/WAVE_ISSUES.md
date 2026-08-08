# Drips Wave Issue Backlog

Each item is independently scoped. Contributors should confirm availability before work and follow `CONTRIBUTING.md`.

## Trivial (12)

<!-- ISSUE -->
### T01: Document deterministic scenario reset patterns
**Context:** Stateful scenarios must replay identically after `reset()`.
**Task:** Add a focused guide and one reset example.
**Acceptance criteria:**
- [ ] Shows counter and seeded-shuffle reset
- [ ] Links the scenario API and tests
**Suggested files:** `docs/SCENARIOS.md`, `examples/README.md`
**Complexity:** trivial
**Skills:** TypeScript reading, technical writing

<!-- ISSUE -->
### T02: Add CLI invalid-config examples
**Context:** Invalid JSON and values need actionable documentation.
**Task:** Document expected errors and corrected commands.
**Acceptance criteria:**
- [ ] Covers malformed JSON and unknown scenario
- [ ] Uses credential-free local URLs
**Suggested files:** `README.md`, `examples/README.md`
**Complexity:** trivial
**Skills:** CLI, documentation

<!-- ISSUE -->
### T03: Test stale ledger zero clamping
**Context:** Large decrements must never create negative ledgers.
**Task:** Expand table-driven boundary tests.
**Acceptance criteria:**
- [ ] Covers `sequence` and `latestLedger`
- [ ] Includes zero and decrement larger than value
**Suggested files:** `tests/core.test.ts`
**Complexity:** trivial
**Skills:** Vitest, TypeScript

<!-- ISSUE -->
### T04: Test rate-limit option boundaries
**Context:** Zero and absent intervals should have explicit behavior.
**Task:** Add tests for `everyNth`, `firstN`, and retry metadata.
**Acceptance criteria:**
- [ ] Covers zero/undefined and combined options
- [ ] Verifies typed error fields
**Suggested files:** `tests/core.test.ts`
**Complexity:** trivial
**Skills:** Vitest

<!-- ISSUE -->
### T05: Improve typed-error API examples
**Context:** Consumers should branch on classes, not message strings.
**Task:** Add examples for timeout, retention, and exhausted failover.
**Acceptance criteria:**
- [ ] Uses `instanceof`
- [ ] Demonstrates preserved causes without logging secrets
**Suggested files:** `README.md`, `examples/README.md`
**Complexity:** trivial
**Skills:** TypeScript, documentation

<!-- ISSUE -->
### T06: Add proxy health response test
**Context:** Health response headers and status are part of integration behavior.
**Task:** Assert status and JSON content type.
**Acceptance criteria:**
- [ ] Verifies 200 and content type
- [ ] Leaves no open server handles
**Suggested files:** `tests/core.test.ts`
**Complexity:** trivial
**Skills:** Vitest, HTTP

<!-- ISSUE -->
### T07: Add event scenario composition example
**Context:** Users need guidance combining missing and duplicate events.
**Task:** Add a deterministic, runnable snippet.
**Acceptance criteria:**
- [ ] Explains declaration order
- [ ] States the expected event IDs
**Suggested files:** `docs/SCENARIOS.md`, `examples/README.md`
**Complexity:** trivial
**Skills:** TypeScript, documentation

<!-- ISSUE -->
### T08: Document Node support policy
**Context:** Supported runtimes should match CI and package engines.
**Task:** Add a short compatibility policy.
**Acceptance criteria:**
- [ ] Names Node 20 and 22
- [ ] Explains when a major can be dropped
**Suggested files:** `README.md`, `CONTRIBUTING.md`
**Complexity:** trivial
**Skills:** documentation

<!-- ISSUE -->
### T09: Add malformed field corruption test
**Context:** `corrupt` mode needs direct coverage.
**Task:** Verify replacement and source immutability.
**Acceptance criteria:**
- [ ] Asserts `__corrupt__`
- [ ] Confirms upstream object is unchanged
**Suggested files:** `tests/core.test.ts`
**Complexity:** trivial
**Skills:** Vitest, immutability

<!-- ISSUE -->
### T10: Improve Docker usage documentation
**Context:** Operators need safe loopback and upstream guidance.
**Task:** Document build, run, compose, and port exposure.
**Acceptance criteria:**
- [ ] Includes non-secret example
- [ ] Warns against public binding
**Suggested files:** `README.md`, `examples/README.md`
**Complexity:** trivial
**Skills:** Docker, documentation

<!-- ISSUE -->
### T11: Add changelog contribution guidance
**Context:** User-visible changes need consistent release notes.
**Task:** Document when and where to add entries.
**Acceptance criteria:**
- [ ] Distinguishes user-visible from internal changes
- [ ] Uses Keep a Changelog categories
**Suggested files:** `CONTRIBUTING.md`, `CHANGELOG.md`
**Complexity:** trivial
**Skills:** release documentation

<!-- ISSUE -->
### T12: Add CODEOWNERS documentation note
**Context:** Contributors should understand review routing.
**Task:** Explain ownership without promising review SLAs.
**Acceptance criteria:**
- [ ] Links review expectations
- [ ] Does not imply organizational affiliation
**Suggested files:** `CONTRIBUTING.md`
**Complexity:** trivial
**Skills:** documentation, GitHub

## Medium (16)

<!-- ISSUE -->
### M01: Add malformed XDR topic scenario
**Context:** Valid JSON can carry invalid base64 or wrong XDR types.
**Task:** Add deterministic topic corruption modes and typed failures.
**Acceptance criteria:**
- [ ] Covers invalid base64 and wrong XDR type
- [ ] Includes tests and scenario documentation
**Suggested files:** `src/chaos/scenarios.ts`, `src/errors.ts`, `tests/core.test.ts`, `docs/SCENARIOS.md`
**Complexity:** medium
**Skills:** TypeScript, Stellar XDR, Vitest

<!-- ISSUE -->
### M02: Add batch JSON-RPC transport support
**Context:** Batch IDs and mixed results require protocol-aware handling.
**Task:** Define and implement typed batch request/response support.
**Acceptance criteria:**
- [ ] Preserves order-independent IDs and per-item errors
- [ ] Rejects malformed or duplicate response IDs
**Suggested files:** `src/types.ts`, `src/transport/http.ts`, `tests/`
**Complexity:** medium
**Skills:** JSON-RPC, TypeScript, testing

<!-- ISSUE -->
### M03: Add browser fetch transport adapter
**Context:** The core transport can run without Node proxy APIs.
**Task:** Create a browser-safe entry point and build target.
**Acceptance criteria:**
- [ ] Avoids Node built-ins in browser bundle
- [ ] Documents CORS and credential limitations
**Suggested files:** `src/transport/`, `package.json`, `tsup.config.ts`, `tests/`
**Complexity:** medium
**Skills:** browser APIs, bundling, TypeScript

<!-- ISSUE -->
### M04: Add redacted structured logging
**Context:** Diagnostics need observability without payload leakage.
**Task:** Add opt-in logger events with a strict field allowlist.
**Acceptance criteria:**
- [ ] Never logs headers, params, XDR, or response bodies
- [ ] Tests common secret-shaped values are absent
**Suggested files:** `src/diagnostics.ts`, `src/transport/http.ts`, `tests/`
**Complexity:** medium
**Skills:** security, logging, TypeScript

<!-- ISSUE -->
### M05: Add Prometheus-style metrics exporter
**Context:** Long integration suites need aggregate fault visibility.
**Task:** Expose counters/histograms from snapshots without request labels.
**Acceptance criteria:**
- [ ] Uses bounded method/scenario labels
- [ ] Documents cardinality and secret constraints
**Suggested files:** `src/metrics.ts`, `src/chaos/engine.ts`, `tests/`
**Complexity:** medium
**Skills:** metrics, TypeScript

<!-- ISSUE -->
### M06: Add OpenTelemetry instrumentation
**Context:** Users need traces across retries, failover, and injected faults.
**Task:** Add optional peer-dependency instrumentation.
**Acceptance criteria:**
- [ ] Emits spans/events without params or credentials
- [ ] Works when OpenTelemetry is absent
**Suggested files:** `src/telemetry.ts`, `package.json`, `tests/`
**Complexity:** medium
**Skills:** OpenTelemetry, package design

<!-- ISSUE -->
### M07: Persist safe event cursor snapshots
**Context:** Consumers need crash-safe restart without duplicate storms.
**Task:** Define a versioned JSON snapshot file adapter with atomic writes.
**Acceptance criteria:**
- [ ] Rejects corrupt/unknown versions
- [ ] Tests atomic replacement and restored deduplication
**Suggested files:** `src/resilience/event-cursor.ts`, `src/resilience/`, `tests/`
**Complexity:** medium
**Skills:** Node filesystem, data migration, testing

<!-- ISSUE -->
### M08: Add WebSocket event cursor adapter
**Context:** Stream reconnects can duplicate or reorder event delivery.
**Task:** Adapt events into `SafeEventCursor` with reconnect boundaries.
**Acceptance criteria:**
- [ ] Deduplicates replay after reconnect
- [ ] Detects ledger regression and supports abort
**Suggested files:** `src/adapters/`, `src/resilience/event-cursor.ts`, `tests/`
**Complexity:** medium
**Skills:** WebSocket, async TypeScript

<!-- ISSUE -->
### M09: Add CLI scenario config files
**Context:** Complex configurations are awkward and leak-prone in shell history.
**Task:** Support validated JSON config files with CLI override precedence.
**Acceptance criteria:**
- [ ] Gives actionable schema errors
- [ ] Refuses credential-like keys
**Suggested files:** `src/cli.ts`, `src/config.ts`, `tests/`
**Complexity:** medium
**Skills:** Commander, Zod, security

<!-- ISSUE -->
### M10: Add CLI dry-run validation command
**Context:** Contributors should validate scenarios without opening a port.
**Task:** Add a command that parses and summarizes safe configuration.
**Acceptance criteria:**
- [ ] Performs no network calls
- [ ] Output excludes arbitrary values and secrets
**Suggested files:** `src/cli.ts`, `tests/`, `README.md`
**Complexity:** medium
**Skills:** CLI, testing

<!-- ISSUE -->
### M11: Publish a reusable GitHub Action definition
**Context:** Repositories need repeatable proxy startup in CI.
**Task:** Add an action that installs, starts, health-checks, and cleans up.
**Acceptance criteria:**
- [ ] Pins runtime actions and cleans up on failure
- [ ] Documents safe secret handling and local-only defaults
**Suggested files:** `action.yml`, `scripts/`, `examples/`
**Complexity:** medium
**Skills:** GitHub Actions, shell, Node

<!-- ISSUE -->
### M12: Add multi-stage Docker integration tests
**Context:** The image must run the built CLI as nonroot.
**Task:** Test image build, user, health, shutdown, and port behavior.
**Acceptance criteria:**
- [ ] Verifies nonroot execution
- [ ] Uses an isolated fixture upstream
**Suggested files:** `Dockerfile`, `tests/docker/`, `.github/workflows/ci.yml`
**Complexity:** medium
**Skills:** Docker, integration testing

<!-- ISSUE -->
### M13: Add scenario authoring example package
**Context:** Extension authors need a complete custom-hook example.
**Task:** Add a typed scenario with state, reset, tests, and docs.
**Acceptance criteria:**
- [ ] Demonstrates before/after/error lifecycle
- [ ] Is runnable with repository scripts
**Suggested files:** `examples/custom-scenario.ts`, `examples/README.md`, `tests/`
**Complexity:** medium
**Skills:** TypeScript, API design

<!-- ISSUE -->
### M14: Add retry jitter with seeded randomness
**Context:** Backoff jitter prevents synchronized retries but tests must replay.
**Task:** Add configurable seeded jitter while preserving current defaults.
**Acceptance criteria:**
- [ ] Existing delays remain backward compatible
- [ ] Seeded sequences reset and test deterministically
**Suggested files:** `src/resilience/retry.ts`, `tests/core.test.ts`
**Complexity:** medium
**Skills:** algorithms, TypeScript, testing

<!-- ISSUE -->
### M15: Add endpoint diagnostics report formats
**Context:** CI needs machine-readable output while humans need concise text.
**Task:** Add stable JSON and human format selection to `check`.
**Acceptance criteria:**
- [ ] Documents a versioned JSON schema
- [ ] Exit codes still reflect unhealthy/regressed state
**Suggested files:** `src/diagnostics.ts`, `src/cli.ts`, `tests/`
**Complexity:** medium
**Skills:** CLI UX, schema design

<!-- ISSUE -->
### M16: Add documentation site validation
**Context:** Mermaid, links, and code samples can drift.
**Task:** Add offline link checks and compile selected TypeScript snippets.
**Acceptance criteria:**
- [ ] Runs in CI without external network
- [ ] Documents how to update fixtures
**Suggested files:** `scripts/`, `.github/workflows/ci.yml`, `package.json`
**Complexity:** medium
**Skills:** documentation tooling, CI

## High (8)

<!-- ISSUE -->
### H01: Design and implement a versioned scenario DSL
**Context:** Portable scenarios need validation without arbitrary code execution.
**Task:** Define a versioned declarative schema and compiler to built-ins.
**Acceptance criteria:**
- [ ] Rejects unknown fields/versions with paths
- [ ] Supports deterministic composition and migration docs
**Suggested files:** `src/dsl/`, `src/chaos/`, `docs/`, `tests/`
**Complexity:** high
**Skills:** language/schema design, Zod, TypeScript

<!-- ISSUE -->
### H02: Secure the proxy control API
**Context:** Runtime scenario changes create a privileged control plane.
**Task:** Add disabled-by-default control endpoints with token authentication.
**Acceptance criteria:**
- [ ] Uses constant-time verification and least-privilege routes
- [ ] Includes replay, brute-force, redaction, and network tests
**Suggested files:** `src/chaos/proxy.ts`, `src/control/`, `docs/THREAT_MODEL.md`, `tests/`
**Complexity:** high
**Skills:** application security, HTTP, threat modeling

<!-- ISSUE -->
### H03: Build a property-based chaos scenario test suite
**Context:** Compositions have a large state space and protocol invariants.
**Task:** Generate request/result/scenario sequences and shrinking reproducers.
**Acceptance criteria:**
- [ ] Asserts determinism, reset, immutability, and valid JSON-RPC IDs
- [ ] Stores seeds, not sensitive payloads
**Suggested files:** `tests/fuzz/`, `package.json`, `docs/`
**Complexity:** high
**Skills:** property-based testing, TypeScript

<!-- ISSUE -->
### H04: Add malformed XDR fuzzing harness
**Context:** XDR parsing must fail safely on adversarial lengths and types.
**Task:** Build a bounded fuzz harness for topics and event values.
**Acceptance criteria:**
- [ ] Has corpus, timeout, memory bounds, and reproducible seeds
- [ ] Never uses production transaction data
**Suggested files:** `tests/fuzz/`, `src/resilience/topics.ts`, `.github/workflows/`
**Complexity:** high
**Skills:** fuzzing, Stellar XDR, security

<!-- ISSUE -->
### H05: Implement protocol-aware batch chaos scenarios
**Context:** Partial batch failure differs from whole-request failure.
**Task:** Add drop, duplicate, reorder, and per-item error scenarios.
**Acceptance criteria:**
- [ ] Correlates by JSON-RPC ID and handles notifications
- [ ] Covers mixed success/error and malformed upstream batches
**Suggested files:** `src/chaos/`, `src/transport/http.ts`, `tests/`
**Complexity:** high
**Skills:** JSON-RPC, algorithms, testing

<!-- ISSUE -->
### H06: Build a browser worker chaos adapter
**Context:** Browser applications need interception without a Node proxy.
**Task:** Provide a worker/interceptor adapter reusing the chaos engine.
**Acceptance criteria:**
- [ ] Documents CORS, service-worker scope, and credential boundaries
- [ ] Passes browser integration tests with deterministic reset
**Suggested files:** `src/browser/`, `examples/browser/`, `tests/browser/`
**Complexity:** high
**Skills:** Service Workers, browser security, bundling

<!-- ISSUE -->
### H07: Implement resilient WebSocket reconnect state machine
**Context:** Disconnects, replay, and retention gaps interact across reconnects.
**Task:** Build an abortable state machine integrating cursor snapshots and backoff.
**Acceptance criteria:**
- [ ] Handles duplicates, out-of-order events, gaps, and endpoint failover
- [ ] Provides deterministic virtual-clock tests
**Suggested files:** `src/resilience/`, `src/adapters/`, `tests/`
**Complexity:** high
**Skills:** distributed systems, WebSocket, state machines

<!-- ISSUE -->
### H08: Create release-grade multi-platform delivery pipeline
**Context:** npm, Docker, and Action artifacts need one auditable release process.
**Task:** Design gated builds with provenance, signing, SBOMs, and dry-run verification.
**Acceptance criteria:**
- [ ] Never publishes from pull requests or forks
- [ ] Verifies package contents, image user, signatures, and rollback docs
**Suggested files:** `.github/workflows/`, `scripts/`, `Dockerfile`, `docs/`
**Complexity:** high
**Skills:** supply-chain security, GitHub Actions, npm, Docker
