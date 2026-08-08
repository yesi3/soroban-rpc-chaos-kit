import type { JsonValue, RpcTransport } from "../types.js";
import type { ChaosScenario, ScenarioContext } from "./scenarios.js";

export interface ChaosStats {
  totalCalls: number;
  methodCalls: Readonly<Record<string, number>>;
  injectedErrors: number;
}

/** Composes deterministic faults around an underlying transport. */
export class ChaosEngine implements RpcTransport {
  private totalCalls = 0;
  private injectedErrors = 0;
  private readonly methodCalls = new Map<string, number>();

  constructor(private readonly upstream: RpcTransport, private readonly scenarios: readonly ChaosScenario[] = []) {}

  async request<R = JsonValue>(method: string, params?: JsonValue, options?: { signal?: AbortSignal }): Promise<R> {
    this.totalCalls++;
    const methodCall = (this.methodCalls.get(method) ?? 0) + 1;
    this.methodCalls.set(method, methodCall);
    const context: ScenarioContext = {
      method,
      methodCall,
      totalCall: this.totalCalls,
      ...(params === undefined ? {} : { params }),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    };
    try {
      for (const scenario of this.scenarios) await scenario.before?.(context);
      let result: unknown = await this.upstream.request(method, params, options);
      for (const scenario of this.scenarios) result = await scenario.after?.(result, context) ?? result;
      return result as R;
    } catch (error) {
      this.injectedErrors++;
      let current: unknown = error;
      for (const scenario of this.scenarios) {
        if (scenario.error) current = await scenario.error(current, context);
      }
      throw current;
    }
  }

  /** Reset counters and stateful scenarios. */
  reset(): void {
    this.totalCalls = 0;
    this.injectedErrors = 0;
    this.methodCalls.clear();
    for (const scenario of this.scenarios) scenario.reset?.();
  }

  /** Return an immutable snapshot of call statistics. */
  stats(): ChaosStats {
    return { totalCalls: this.totalCalls, methodCalls: Object.fromEntries(this.methodCalls), injectedErrors: this.injectedErrors };
  }
}
