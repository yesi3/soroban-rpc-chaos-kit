import { AllEndpointsFailedError } from "../errors.js";
import type { JsonValue, RpcTransport } from "../types.js";

export interface FailoverEndpoint { name: string; transport: RpcTransport }
export interface EndpointHealth { failures: number; cooldownUntil: number }

/** Ordered multi-endpoint transport with failure cooldowns. */
export class FailoverTransport implements RpcTransport {
  private readonly health = new Map<string, EndpointHealth>();
  constructor(
    private readonly endpoints: readonly FailoverEndpoint[],
    private readonly options: { cooldownMs?: number; failureThreshold?: number; now?: () => number } = {},
  ) {
    if (endpoints.length === 0) throw new RangeError("At least one endpoint is required");
  }

  async request<R = JsonValue>(method: string, params?: JsonValue, options?: { signal?: AbortSignal }): Promise<R> {
    const now = (this.options.now ?? Date.now)();
    const available = this.endpoints.filter((endpoint) => (this.health.get(endpoint.name)?.cooldownUntil ?? 0) <= now);
    const candidates = available.length > 0 ? available : this.endpoints;
    const failures: { endpoint: string; error: unknown }[] = [];
    for (const endpoint of candidates) {
      try {
        const result = await endpoint.transport.request<R>(method, params, options);
        this.health.set(endpoint.name, { failures: 0, cooldownUntil: 0 });
        return result;
      } catch (error) {
        failures.push({ endpoint: endpoint.name, error });
        const old = this.health.get(endpoint.name)?.failures ?? 0;
        const count = old + 1;
        const cooldownUntil = count >= (this.options.failureThreshold ?? 1) ? now + (this.options.cooldownMs ?? 30_000) : 0;
        this.health.set(endpoint.name, { failures: count, cooldownUntil });
      }
    }
    throw new AllEndpointsFailedError(failures);
  }

  /** Snapshot endpoint health without exposing transport URLs or credentials. */
  healthSnapshot(): Readonly<Record<string, EndpointHealth>> {
    return Object.fromEntries([...this.health].map(([name, value]) => [name, { ...value }]));
  }
}
