import {
  MalformedRpcResponseError,
  RpcRateLimitError,
  RpcRetentionError,
  RpcTimeoutError,
  RpcTransportError,
} from "../errors.js";
import type { JsonRpcResponse, JsonValue, RpcTransport } from "../types.js";

export interface HttpTransportOptions {
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
}

/** Standards-based fetch JSON-RPC transport. */
export class HttpRpcTransport implements RpcTransport {
  private id = 0;
  constructor(public readonly url: string, private readonly options: HttpTransportOptions = {}) {
    if (!url.trim()) throw new TypeError("RPC URL is required");
  }

  async request<R = JsonValue>(method: string, params?: JsonValue, requestOptions?: { signal?: AbortSignal }): Promise<R> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("timeout")), this.options.timeoutMs ?? 10_000);
    const onAbort = (): void => controller.abort(requestOptions?.signal?.reason);
    requestOptions?.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const response = await (this.options.fetch ?? globalThis.fetch)(this.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...this.options.headers },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, ...(params === undefined ? {} : { params }) }),
        signal: controller.signal,
      });
      if (response.status === 429) {
        throw new RpcRateLimitError("RPC rate limited", parseRetryAfter(response.headers.get("retry-after")));
      }
      if (!response.ok) throw new RpcTransportError(`RPC HTTP ${response.status}`, response.status);
      let body: JsonRpcResponse<R>;
      try {
        body = (await response.json()) as JsonRpcResponse<R>;
      } catch (cause) {
        throw new MalformedRpcResponseError("RPC returned invalid JSON", response.status, undefined, { cause });
      }
      if (!body || body.jsonrpc !== "2.0" || (!("result" in body) && !("error" in body))) {
        throw new MalformedRpcResponseError("Malformed JSON-RPC response");
      }
      if ("error" in body) {
        const message = body.error.message;
        if (/retention|ledger.*(old|range)/i.test(message)) {
          throw new RpcRetentionError(message);
        }
        throw new RpcTransportError(message, response.status, body.error.data);
      }
      return body.result;
    } catch (cause) {
      if (cause instanceof RpcTransportError) throw cause;
      if (controller.signal.aborted) throw new RpcTimeoutError("RPC request timed out", undefined, undefined, { cause });
      throw new RpcTransportError("RPC request failed", undefined, undefined, { cause });
    } finally {
      clearTimeout(timeout);
      requestOptions?.signal?.removeEventListener("abort", onAbort);
    }
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}
