import type { LedgerResponse, RpcTransport } from "./types.js";

export interface EndpointDiagnostics {
  healthy: boolean;
  firstLedger: number;
  secondLedger?: number;
  delta?: number;
  regressed: boolean;
}

/** Inspect health and ledger progression without exposing endpoint credentials. */
export async function inspectEndpoint(
  transport: RpcTransport,
  options: { samples?: number; sampleDelayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<EndpointDiagnostics> {
  const health = await transport.request<{ status?: string }>("getHealth");
  const first = await transport.request<LedgerResponse>("getLatestLedger");
  const healthy = health.status === undefined || health.status === "healthy";
  if ((options.samples ?? 1) < 2) return { healthy, firstLedger: first.sequence, regressed: false };
  await (options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(options.sampleDelayMs ?? 250);
  const second = await transport.request<LedgerResponse>("getLatestLedger");
  return {
    healthy,
    firstLedger: first.sequence,
    secondLedger: second.sequence,
    delta: second.sequence - first.sequence,
    regressed: second.sequence < first.sequence,
  };
}
