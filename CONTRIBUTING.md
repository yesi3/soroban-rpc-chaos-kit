# Contributing

Thanks for improving Soroban RPC Chaos Kit. Keep changes focused, reproducible, and safe for downstream users.

## Local setup

Requires Node.js 20 or 22 and npm.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Never point destructive experiments at production infrastructure. Use a local RPC, testnet endpoint, or controlled fixture and keep credentials out of source, fixtures, logs, issue bodies, and recordings.

## Contributor workflow

1. Choose or open one narrowly scoped issue and comment before substantial work.
2. Create a short-lived branch, add tests with the change, and update relevant docs.
3. Run the full checks above and inspect the package dry run for accidental files.
4. Open a small PR that explains the failure mode, design choice, and verification.
5. Respond to review, keep the branch current, and avoid unrelated formatting or dependency churn.

Use Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`), with an optional scope such as `feat(proxy):`. A PR may contain multiple commits, but each commit should remain coherent.

## Tests and scope

Bug fixes require a regression test. New scenarios require deterministic unit tests, a realistic Stellar failure description, reset/replay coverage for stateful behavior, and proxy coverage when applicable. Tests must not depend on public network availability or timing luck.

Keep one behavior change per PR. Do not combine broad refactors, generated output, dependency upgrades, or public API changes with an otherwise isolated task.

## Public API and compatibility

Exports, scenario names/configuration, typed errors, CLI flags, and observable proxy behavior are public API. Preserve backward compatibility within the `0.x` line when practical. Call out necessary breaks explicitly, provide a migration note, and add a changelog entry. Do not silently weaken typing or change deterministic sequences.

## Adding a chaos scenario

1. Implement the `ChaosScenario` hooks in `src/chaos/scenarios.ts` or a focused module.
2. Give it a stable kebab-case name and document whether it runs `before`, `after`, or `error`.
3. Keep all randomness seeded; implement `reset()` for mutable state.
4. Throw existing typed errors or add a documented typed error.
5. Add unit tests, proxy/CLI wiring if useful, and a catalog entry in `docs/SCENARIOS.md`.
6. Confirm diagnostics and logs never expose parameters, headers, XDR payloads, or credentials.

## Drips Wave collaboration

Issues labeled for Wave are designed to be independently reviewable; the project is not limited to Wave contributors. Claim one task at a time and post a short plan before coding. Maintainers aim to acknowledge proposals within three business days and provide an initial PR review within five business days. Contributors should respond to review within five business days or post a status update. These are targets, not guarantees; security reports must use the private process in `SECURITY.md`.

All participation is governed by `CODE_OF_CONDUCT.md`.
