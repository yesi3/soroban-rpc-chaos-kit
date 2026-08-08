# Examples

Examples import source files so they run from a checkout after `npm ci`.

## Vitest stale-ledger regression

`vitest-stale-ledger.ts` shows an in-process fixture:

```sh
npx vitest run examples/vitest-stale-ledger.ts
```

It uses no network and demonstrates a stable expected ledger decrement.

## Programmatic proxy

`proxy.config.ts` starts a proxy on port 9000 and rate-limits every fifth request:

```sh
SOROBAN_RPC_URL=http://127.0.0.1:8000 npx tsx examples/proxy.config.ts
```

Stop it with `Ctrl-C`. Use only local/test endpoints. Do not place credentials in `SOROBAN_RPC_URL`, source files, shell history, or logs; authenticated transports should receive secret-manager headers programmatically.

## Packaged CLI

After `npm run build`, run:

```sh
node dist/cli.js proxy \
  --upstream http://127.0.0.1:8000 \
  --port 9000 \
  --scenario retention \
  --config '{"minimumLedger":4900000}'
```

Point a test client at `http://127.0.0.1:9000`.

## Docker

```sh
docker build -t soroban-rpc-chaos-kit .
docker compose -f docker-compose.example.yml up --build
```

The image runs as the unprivileged `node` user. Compose publishes container port 9000 only on host loopback. The process binds `0.0.0.0` inside its isolated container so Docker forwarding works; do not change host publishing to `0.0.0.0:9000` on an untrusted network.

## Safe cursor and topic

```ts
import { SafeEventCursor, buildContractEventFilter } from "../src/index.js";

const cursor = await SafeEventCursor.seed(async () => 100);
const params = {
  startLedger: cursor.nextStartLedger(90),
  filters: [buildContractEventFilter(["CA..."], ["transfer"])],
};
```

After each response, call `cursor.observe(events, latestLedger)` and persist `cursor.snapshot()` only in an access-controlled location. Snapshots contain event IDs and may be operationally sensitive.

See `docs/SCENARIOS.md` for every built-in fault and `CONTRIBUTING.md` for scenario authoring requirements.
