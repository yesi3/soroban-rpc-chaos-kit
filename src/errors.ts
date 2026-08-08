import type { JsonValue } from "./types.js";

/** Base error for all chaos-kit failures. */
export class ChaosKitError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** HTTP or JSON-RPC transport failure. */
export class RpcTransportError extends ChaosKitError {
  constructor(message: string, public readonly status?: number, public readonly data?: JsonValue, options?: ErrorOptions) {
    super(message, options);
  }
}

/** RPC request exceeded its deadline. */
export class RpcTimeoutError extends RpcTransportError {}

/** RPC server rate-limited a request. */
export class RpcRateLimitError extends RpcTransportError {
  constructor(message = "RPC rate limited", public readonly retryAfterMs?: number, options?: ErrorOptions) {
    super(message, 429, undefined, options);
  }
}

/** Requested ledger is outside server retention. */
export class RpcRetentionError extends RpcTransportError {
  constructor(message: string, public readonly minimumLedger?: number, options?: ErrorOptions) {
    super(message, undefined, undefined, options);
  }
}

/** A ledger sample regressed below the accepted sequence. */
export class StaleLedgerError extends ChaosKitError {
  constructor(public readonly observed: number, public readonly previous: number) {
    super(`Ledger regressed from ${previous} to ${observed}`);
  }
}

/** RPC response did not satisfy JSON-RPC shape. */
export class MalformedRpcResponseError extends RpcTransportError {}

/** Every configured failover endpoint failed. */
export class AllEndpointsFailedError extends ChaosKitError {
  constructor(public readonly failures: readonly { endpoint: string; error: unknown }[]) {
    super(`All ${failures.length} RPC endpoints failed`, { cause: failures.at(-1)?.error });
  }
}
