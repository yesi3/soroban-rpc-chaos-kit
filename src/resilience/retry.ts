import { RpcRateLimitError } from "../errors.js";

export interface RetryContext { attempt: number; error: unknown }
export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: (delayMs: number, attempt: number) => number;
  classify?: (context: RetryContext) => boolean;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  signal?: AbortSignal;
}

/** Execute an operation with bounded exponential backoff. */
export async function retry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  if (!Number.isSafeInteger(attempts) || attempts < 1) throw new RangeError("attempts must be at least 1");
  if (
    options.baseDelayMs !== undefined &&
    (!Number.isFinite(options.baseDelayMs) || options.baseDelayMs < 0)
  ) {
    throw new RangeError("baseDelayMs must be a non-negative finite number");
  }
  for (let attempt = 1; ; attempt++) {
    options.signal?.throwIfAborted();
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= attempts || options.classify?.({ attempt, error }) === false) throw error;
      const exponential = Math.min(options.maxDelayMs ?? 30_000, (options.baseDelayMs ?? 100) * 2 ** (attempt - 1));
      const retryAfter = error instanceof RpcRateLimitError ? error.retryAfterMs : undefined;
      const base = retryAfter ?? exponential;
      const delay = Math.max(0, options.jitter?.(base, attempt) ?? base);
      await (options.sleep ?? sleep)(delay, options.signal);
    }
  }
}

async function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    const abort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}
