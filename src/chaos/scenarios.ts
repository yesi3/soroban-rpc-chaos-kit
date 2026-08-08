import {
  MalformedRpcResponseError,
  RpcRateLimitError,
  RpcRetentionError,
  RpcTimeoutError,
} from "../errors.js";
import type { JsonValue, RpcEvent } from "../types.js";

export interface ScenarioContext {
  method: string;
  params?: JsonValue;
  methodCall: number;
  totalCall: number;
  signal?: AbortSignal;
}

/** A composable deterministic request fault. */
export interface ChaosScenario {
  readonly name: string;
  before?(context: ScenarioContext): Promise<void> | void;
  after?(result: unknown, context: ScenarioContext): Promise<unknown> | unknown;
  error?(error: unknown, context: ScenarioContext): Promise<unknown> | unknown;
  reset?(): void;
}

/** Replace ledger values with a stale sequence. */
export function staleLedger(decrement = 1): ChaosScenario {
  return {
    name: "stale-ledger",
    after(result) {
      if (!isRecord(result)) return result;
      const copy = { ...result };
      for (const field of ["sequence", "latestLedger"]) {
        if (typeof copy[field] === "number") copy[field] = Math.max(0, copy[field] - decrement);
      }
      return copy;
    },
  };
}

/** Emit a configured ledger sequence plan over matching calls. */
export function regressingLedger(plan: readonly number[]): ChaosScenario {
  let index = 0;
  return {
    name: "regressing-ledger",
    after(result) {
      if (!isRecord(result) || plan.length === 0) return result;
      const value = plan[Math.min(index++, plan.length - 1)]!;
      if (typeof result.sequence === "number") return { ...result, sequence: value };
      if (typeof result.latestLedger === "number") return { ...result, latestLedger: value };
      return result;
    },
    reset: () => { index = 0; },
  };
}

/** Reject getEvents requests older than the retention boundary. */
export function retentionRejection(minimumLedger: number): ChaosScenario {
  return {
    name: "retention-rejection",
    before(context) {
      if (context.method !== "getEvents" || !isRecord(context.params)) return;
      if (typeof context.params.startLedger === "number" && context.params.startLedger < minimumLedger) {
        throw new RpcRetentionError(`startLedger is below retained minimum ${minimumLedger}`, minimumLedger);
      }
    },
  };
}

/** Delay requests or wait until their abort signal fires. */
export function timeoutScenario(options: { delayMs?: number; neverResolve?: boolean } = {}): ChaosScenario {
  return {
    name: "timeout",
    async before(context) {
      if (options.neverResolve) {
        await new Promise<never>((_resolve, reject) => {
          const abort = (): void => reject(new RpcTimeoutError("Injected timeout"));
          if (context.signal?.aborted) abort();
          else context.signal?.addEventListener("abort", abort, { once: true });
        });
      }
      if ((options.delayMs ?? 0) > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, options.delayMs);
          context.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new RpcTimeoutError("Injected timeout"));
          }, { once: true });
        });
      }
    },
  };
}

/** Inject rate limits on initial or periodic calls. */
export function rateLimit(options: { everyNth?: number; firstN?: number; retryAfterMs?: number }): ChaosScenario {
  return {
    name: "rate-limit",
    before(context) {
      const initial = context.methodCall <= (options.firstN ?? 0);
      const periodic = options.everyNth !== undefined && options.everyNth > 0 && context.methodCall % options.everyNth === 0;
      if (initial || periodic) throw new RpcRateLimitError("Injected rate limit", options.retryAfterMs);
    },
  };
}

/** Omit or replace a top-level response field. */
export function malformedResponse(field: string, mode: "omit" | "corrupt" = "omit"): ChaosScenario {
  return {
    name: "malformed-response",
    after(result) {
      if (!isRecord(result)) throw new MalformedRpcResponseError("Cannot malform non-object response");
      const copy = { ...result };
      if (mode === "omit") delete copy[field];
      else copy[field] = "__corrupt__";
      return copy;
    },
  };
}

/** Drop every Nth event. */
export function missingEvents(everyNth: number): ChaosScenario {
  return eventTransform("missing-events", (events) => events.filter((_event, index) => (index + 1) % everyNth !== 0));
}

/** Duplicate events selected by a predicate or interval. */
export function duplicateEvents(select: number | ((event: RpcEvent, index: number) => boolean) = 1): ChaosScenario {
  return eventTransform("duplicate-events", (events) => events.flatMap((event, index) => {
    const chosen = typeof select === "number" ? (index + 1) % select === 0 : select(event, index);
    return chosen ? [event, { ...event }] : [event];
  }));
}

/** Reverse or seeded-shuffle event order. */
export function outOfOrderEvents(mode: "reverse" | "shuffle" = "reverse", seed = 1): ChaosScenario {
  let random = mulberry32(seed);
  return {
    ...eventTransform("out-of-order-events", (events) => {
      const copy = [...events];
      if (mode === "reverse") return copy.reverse();
      for (let index = copy.length - 1; index > 0; index--) {
        const swap = Math.floor(random() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
      }
      return copy;
    }),
    reset: () => { random = mulberry32(seed); },
  };
}

function eventTransform(name: string, transform: (events: RpcEvent[]) => RpcEvent[]): ChaosScenario {
  return {
    name,
    after(result) {
      if (!isRecord(result) || !Array.isArray(result.events)) return result;
      return { ...result, events: transform(result.events as RpcEvent[]) };
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}
