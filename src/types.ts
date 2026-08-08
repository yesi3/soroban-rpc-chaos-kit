/** JSON values accepted by JSON-RPC. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** A JSON-RPC 2.0 request. */
export interface JsonRpcRequest<P = JsonValue> {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: P;
}

/** A JSON-RPC error object. */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: JsonValue;
}

/** A JSON-RPC 2.0 response. */
export type JsonRpcResponse<R = JsonValue> =
  | { jsonrpc: "2.0"; id: string | number | null; result: R }
  | { jsonrpc: "2.0"; id: string | number | null; error: JsonRpcError };

/** Pluggable RPC request transport. */
export interface RpcTransport {
  request<R = JsonValue>(method: string, params?: JsonValue, options?: { signal?: AbortSignal }): Promise<R>;
}

/** Minimal injectable structured logger. */
export interface Logger {
  debug?(message: string, context?: Record<string, unknown>): void;
  info?(message: string, context?: Record<string, unknown>): void;
  warn?(message: string, context?: Record<string, unknown>): void;
  error?(message: string, context?: Record<string, unknown>): void;
}

/** Soroban latest-ledger shaped response. */
export interface LedgerResponse {
  id?: string;
  sequence: number;
  protocolVersion?: number;
  [key: string]: unknown;
}

/** Soroban contract event. */
export interface RpcEvent {
  id: string;
  ledger: number;
  topic?: string[];
  value?: string;
  [key: string]: unknown;
}

/** Soroban getEvents shaped response. */
export interface EventsResponse {
  events: RpcEvent[];
  latestLedger: number;
  cursor?: string;
  [key: string]: unknown;
}
