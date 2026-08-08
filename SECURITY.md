# Security Policy

## Supported version

Until the first stable release, only the latest `0.1.x` release on the default branch receives security fixes. Older snapshots and forks are unsupported.

## Reporting a vulnerability

Do not open a public issue. Use the repository's **Security → Report a vulnerability** flow to submit a private GitHub Security Advisory. Include affected versions, impact, minimal reproduction, and suggested mitigation without real credentials or sensitive transaction data. Maintainers aim to acknowledge reports within three business days, provide an initial assessment within seven, and coordinate disclosure after a fix is available.

If private reporting is unavailable, contact the repository owner through their GitHub profile and ask for a private channel; do not send exploit details publicly.

## Threat model

This is a developer test tool, not a production gateway or security boundary. It accepts JSON-RPC payloads, forwards them to a configured upstream, and intentionally corrupts or delays responses. Risks include unintended network exposure, SSRF through untrusted upstream configuration, disclosure of authorization headers or transaction envelopes, denial of service through large/slow requests, and unauthenticated access to control or diagnostics endpoints.

The proxy binds to loopback by default and limits request bodies, but operators remain responsible for network isolation, upstream allowlists, TLS, authentication, resource limits, and data handling. See `docs/THREAT_MODEL.md`.

## Secret-free operation

Never include RPC credentials, bearer tokens, cookies, private keys, seed phrases, signed transaction envelopes, or confidential XDR in scenarios, CLI arguments, configuration committed to source, logs, issue reports, fixtures, snapshots, or recordings. Inject required headers programmatically from a secret manager and redact payloads before sharing. Rotate credentials immediately if exposed.
