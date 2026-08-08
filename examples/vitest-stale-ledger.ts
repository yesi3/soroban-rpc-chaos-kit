import { expect, test } from "vitest";
import { ChaosEngine, staleLedger, type RpcTransport } from "../src/index.js";

test("application detects a stale RPC ledger", async () => {
  const upstream: RpcTransport = {
    async request<R>(): Promise<R> { return { sequence: 100 } as R; },
  };
  const transport = new ChaosEngine(upstream, [staleLedger(2)]);
  await expect(transport.request("getLatestLedger")).resolves.toMatchObject({ sequence: 98 });
});
