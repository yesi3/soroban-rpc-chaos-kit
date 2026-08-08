import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AllEndpointsFailedError,
  ChaosEngine,
  ChaosProxy,
  FailoverTransport,
  HttpRpcTransport,
  MalformedRpcResponseError,
  MonotonicLedgerGuard,
  RpcRateLimitError,
  RpcRetentionError,
  RpcTimeoutError,
  RpcTransportError,
  SafeEventCursor,
  StaleLedgerError,
  buildContractEventFilter,
  decodeTopicSymbol,
  duplicateEvents,
  encodeTopicSymbol,
  malformedResponse,
  missingEvents,
  outOfOrderEvents,
  rateLimit,
  regressingLedger,
  retentionRejection,
  retry,
  staleLedger,
  timeoutScenario,
  type JsonValue,
  type RpcEvent,
  type RpcTransport,
} from "../src/index.js";

const rpc = (value: unknown): RpcTransport => ({
  async request<R>(): Promise<R> { return value as R; },
});
const events = (): RpcEvent[] => [
  { id: "1", ledger: 10 }, { id: "2", ledger: 11 }, { id: "3", ledger: 12 },
];

describe("chaos scenarios", () => {
  it("decrements sequence", async () => {
    expect(await new ChaosEngine(rpc({ sequence: 10 }), [staleLedger(2)]).request("getLatestLedger")).toEqual({ sequence: 8 });
  });
  it("decrements latestLedger", async () => {
    expect(await new ChaosEngine(rpc({ latestLedger: 10 }), [staleLedger()]).request("getEvents")).toEqual({ latestLedger: 9 });
  });
  it("never makes stale ledger negative", async () => {
    expect(await new ChaosEngine(rpc({ sequence: 0 }), [staleLedger(5)]).request("x")).toEqual({ sequence: 0 });
  });
  it("replays a regressing ledger plan", async () => {
    const engine = new ChaosEngine(rpc({ sequence: 99 }), [regressingLedger([10, 9])]);
    expect((await engine.request<{ sequence: number }>("x")).sequence).toBe(10);
    expect((await engine.request<{ sequence: number }>("x")).sequence).toBe(9);
  });
  it("rejects startLedger=1 below retention (real bug)", async () => {
    await expect(new ChaosEngine(rpc({}), [retentionRejection(5)]).request("getEvents", { startLedger: 1 })).rejects.toBeInstanceOf(RpcRetentionError);
  });
  it("allows the retention boundary", async () => {
    await expect(new ChaosEngine(rpc("ok"), [retentionRejection(5)]).request("getEvents", { startLedger: 5 })).resolves.toBe("ok");
  });
  it("rate limits every Nth method call", async () => {
    const engine = new ChaosEngine(rpc("ok"), [rateLimit({ everyNth: 2 })]);
    await engine.request("x");
    await expect(engine.request("x")).rejects.toBeInstanceOf(RpcRateLimitError);
  });
  it("rate limits first N calls", async () => {
    const engine = new ChaosEngine(rpc("ok"), [rateLimit({ firstN: 1 })]);
    await expect(engine.request("x")).rejects.toBeInstanceOf(RpcRateLimitError);
    await expect(engine.request("x")).resolves.toBe("ok");
  });
  it("omits malformed fields", async () => {
    expect(await new ChaosEngine(rpc({ sequence: 1 }), [malformedResponse("sequence")]).request("x")).toEqual({});
  });
  it("drops every Nth event", async () => {
    const result = await new ChaosEngine(rpc({ events: events(), latestLedger: 12 }), [missingEvents(2)]).request<{ events: RpcEvent[] }>("x");
    expect(result.events.map(({ id }) => id)).toEqual(["1", "3"]);
  });
  it("duplicates selected events", async () => {
    const result = await new ChaosEngine(rpc({ events: events(), latestLedger: 12 }), [duplicateEvents(2)]).request<{ events: RpcEvent[] }>("x");
    expect(result.events.map(({ id }) => id)).toEqual(["1", "2", "2", "3"]);
  });
  it("reverses events", async () => {
    const result = await new ChaosEngine(rpc({ events: events(), latestLedger: 12 }), [outOfOrderEvents()]).request<{ events: RpcEvent[] }>("x");
    expect(result.events.map(({ id }) => id)).toEqual(["3", "2", "1"]);
  });
  it("seeded shuffles reproduce after reset", async () => {
    const engine = new ChaosEngine(rpc({ events: events(), latestLedger: 12 }), [outOfOrderEvents("shuffle", 42)]);
    const first = await engine.request("x");
    engine.reset();
    expect(await engine.request("x")).toEqual(first);
  });
  it("abort ends never-resolving timeout", async () => {
    const controller = new AbortController();
    const promise = new ChaosEngine(rpc("no"), [timeoutScenario({ neverResolve: true })]).request("x", undefined, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(RpcTimeoutError);
  });
});

describe("chaos engine", () => {
  it("counts total and method calls", async () => {
    const engine = new ChaosEngine(rpc("ok"));
    await engine.request("a"); await engine.request("b"); await engine.request("a");
    expect(engine.stats()).toEqual({ totalCalls: 3, methodCalls: { a: 2, b: 1 }, injectedErrors: 0 });
  });
  it("composes scenarios in order", async () => {
    expect(await new ChaosEngine(rpc({ sequence: 10 }), [staleLedger(2), staleLedger(3)]).request("x")).toEqual({ sequence: 5 });
  });
  it("preserves typed injected errors", async () => {
    await expect(new ChaosEngine(rpc("ok"), [rateLimit({ firstN: 1 })]).request("x")).rejects.toBeInstanceOf(RpcRateLimitError);
  });
  it("resets statistics", async () => {
    const engine = new ChaosEngine(rpc("ok")); await engine.request("x"); engine.reset();
    expect(engine.stats().totalCalls).toBe(0);
  });
});

describe("ledger guard", () => {
  it("accepts first ledger", () => expect(new MonotonicLedgerGuard().observe(10).accepted).toBe(true));
  it("accepts equal ledger", () => { const guard = new MonotonicLedgerGuard(); guard.observe(10); expect(guard.observe(10).accepted).toBe(true); });
  it("rejects regression with typed error", () => {
    const guard = new MonotonicLedgerGuard(); guard.observe(10);
    expect(() => guard.observe(9)).toThrow(StaleLedgerError);
  });
  it("warn policy retains high-water mark", () => {
    const guard = new MonotonicLedgerGuard("warn"); guard.observe(10);
    expect(guard.observe(9)).toMatchObject({ accepted: false, current: 10, regressed: true });
  });
  it("accept policy moves backwards explicitly", () => {
    const guard = new MonotonicLedgerGuard("accept"); guard.observe(10);
    expect(guard.observe(9).current).toBe(9);
  });
});

describe("event cursor", () => {
  it("seeds after latest ledger", async () => expect((await SafeEventCursor.seed(async () => 10)).nextStartLedger()).toBe(11));
  it("deduplicates event IDs", async () => {
    const cursor = await SafeEventCursor.seed(async () => 9);
    expect(cursor.observe([{ id: "x", ledger: 10 }, { id: "x", ledger: 10 }])).toHaveLength(1);
  });
  it("advances beyond observed ledger", async () => {
    const cursor = await SafeEventCursor.seed(async () => 9); cursor.observe([{ id: "x", ledger: 12 }]);
    expect(cursor.nextStartLedger()).toBe(13);
  });
  it("clamps to retention minimum", async () => {
    const cursor = await SafeEventCursor.seed(async () => 0);
    expect(cursor.nextStartLedger(5)).toBe(5);
  });
  it("rejects retention gap when configured", async () => {
    const cursor = await SafeEventCursor.seed(async () => 0);
    expect(() => cursor.nextStartLedger(5, "reject")).toThrow(RpcRetentionError);
  });
  it("restores snapshots and duplicate history", async () => {
    const cursor = await SafeEventCursor.seed(async () => 9); cursor.observe([{ id: "x", ledger: 10 }]);
    const restored = SafeEventCursor.restore(cursor.snapshot());
    expect(restored.observe([{ id: "x", ledger: 10 }])).toEqual([]);
  });
  it("rejects regressing latestLedger (real bug)", async () => {
    const cursor = await SafeEventCursor.seed(async () => 10);
    expect(() => cursor.observe([], 9)).toThrow(StaleLedgerError);
  });
});

describe("retry", () => {
  it("returns first success", async () => expect(await retry(async () => 7)).toBe(7));
  it("retries and succeeds", async () => {
    let calls = 0;
    expect(await retry(async () => { if (++calls < 2) throw new Error("x"); return calls; }, { sleep: async () => undefined })).toBe(2);
  });
  it("uses exponential delays", async () => {
    const delays: number[] = [];
    await expect(retry(async () => { throw new Error("x"); }, { attempts: 3, baseDelayMs: 5, sleep: async (ms) => { delays.push(ms); } })).rejects.toThrow("x");
    expect(delays).toEqual([5, 10]);
  });
  it("honors Retry-After", async () => {
    const delays: number[] = [];
    await expect(retry(async () => { throw new RpcRateLimitError("x", 99); }, { attempts: 2, sleep: async (ms) => { delays.push(ms); } })).rejects.toThrow();
    expect(delays).toEqual([99]);
  });
  it("classifier stops swallowed-error retries (real bug)", async () => {
    let calls = 0;
    await expect(retry(async () => { calls++; throw new TypeError("bad"); }, { classify: () => false })).rejects.toBeInstanceOf(TypeError);
    expect(calls).toBe(1);
  });
  it("observes pre-aborted signal", async () => {
    const controller = new AbortController(); controller.abort(new Error("stop"));
    await expect(retry(async () => 1, { signal: controller.signal })).rejects.toThrow("stop");
  });
});

describe("failover", () => {
  it("uses second endpoint after first fails", async () => {
    const bad: RpcTransport = { async request() { throw new Error("down"); } };
    const transport = new FailoverTransport([{ name: "a", transport: bad }, { name: "b", transport: rpc("ok") }]);
    await expect(transport.request("x")).resolves.toBe("ok");
  });
  it("throws typed final error without swallowing causes", async () => {
    const bad: RpcTransport = { async request() { throw new RpcTransportError("down"); } };
    await expect(new FailoverTransport([{ name: "a", transport: bad }]).request("x")).rejects.toBeInstanceOf(AllEndpointsFailedError);
  });
  it("places failed endpoint in cooldown", async () => {
    const bad: RpcTransport = { async request() { throw new Error("down"); } };
    const transport = new FailoverTransport([{ name: "a", transport: bad }, { name: "b", transport: rpc("ok") }], { now: () => 10, cooldownMs: 50 });
    await transport.request("x");
    expect(transport.healthSnapshot().a?.cooldownUntil).toBe(60);
  });
  it("requires endpoints", () => expect(() => new FailoverTransport([])).toThrow(RangeError));
});

describe("topic XDR", () => {
  it("round trips a symbol", () => expect(decodeTopicSymbol(encodeTopicSymbol("transfer"))).toBe("transfer"));
  it("rejects raw topic instead of confusing it with base64 XDR (real bug)", () => expect(() => decodeTopicSymbol("transfer")).toThrow(TypeError));
  it("rejects oversized symbols", () => expect(() => encodeTopicSymbol("x".repeat(33))).toThrow(RangeError));
  it("builds encoded contract filters", () => {
    const filter = buildContractEventFilter(["CA"], ["mint"]);
    expect(decodeTopicSymbol(filter.topics![0]![0]!)).toBe("mint");
  });
});

describe("HTTP transport", () => {
  it("returns JSON-RPC results", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { sequence: 2 } })));
    await expect(new HttpRpcTransport("http://local", { fetch }).request("x")).resolves.toEqual({ sequence: 2 });
  });
  it("turns 429 into typed error", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "2" } }));
    await expect(new HttpRpcTransport("http://local", { fetch }).request("x")).rejects.toMatchObject({ retryAfterMs: 2000 });
  });
  it("preserves JSON-RPC error data", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -1, message: "bad", data: { detail: 1 } } })));
    await expect(new HttpRpcTransport("http://local", { fetch }).request("x")).rejects.toMatchObject({ data: { detail: 1 } });
  });
  it("types retention errors", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -1, message: "ledger too old for retention" } })));
    await expect(new HttpRpcTransport("http://local", { fetch }).request("x")).rejects.toBeInstanceOf(RpcRetentionError);
  });
  it("types invalid JSON", async () => {
    const fetch = vi.fn(async () => new Response("{"));
    await expect(new HttpRpcTransport("http://local", { fetch }).request("x")).rejects.toBeInstanceOf(MalformedRpcResponseError);
  });
  it("times out stalled fetch", async () => {
    const fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    await expect(new HttpRpcTransport("http://local", { fetch, timeoutMs: 1 }).request("x")).rejects.toBeInstanceOf(RpcTimeoutError);
  });
});

describe("proxy integration", () => {
  const proxies: ChaosProxy[] = [];
  afterEach(async () => { await Promise.all(proxies.splice(0).map((proxy) => proxy.close())); });

  it("serves health", async () => {
    const proxy = new ChaosProxy(new ChaosEngine(rpc("ok"))); proxies.push(proxy);
    const address = await proxy.listen();
    await expect(fetch(`${address.url}/health`).then((response) => response.json())).resolves.toEqual({ status: "ok" });
  });
  it("forwards JSON-RPC through chaos", async () => {
    const proxy = new ChaosProxy(new ChaosEngine(rpc({ sequence: 10 }), [staleLedger(1)])); proxies.push(proxy);
    const address = await proxy.listen();
    const response = await fetch(address.url, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "getLatestLedger" }) });
    await expect(response.json()).resolves.toMatchObject({ id: 7, result: { sequence: 9 } });
  });
  it("exposes anonymous stats", async () => {
    const proxy = new ChaosProxy(new ChaosEngine(rpc("ok"))); proxies.push(proxy);
    const address = await proxy.listen();
    await fetch(address.url, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "x", params: { token: "secret" } satisfies JsonValue }) });
    const stats = await fetch(`${address.url}/__chaos/stats`).then((response) => response.json()) as { totalCalls: number };
    expect(stats.totalCalls).toBe(1);
    expect(JSON.stringify(stats)).not.toContain("secret");
  });
});
