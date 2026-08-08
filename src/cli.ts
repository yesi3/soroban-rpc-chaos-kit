#!/usr/bin/env node
import { Command } from "commander";
import { z } from "zod";
import { ChaosEngine } from "./chaos/engine.js";
import { ChaosProxy } from "./chaos/proxy.js";
import { rateLimit, retentionRejection, staleLedger, timeoutScenario, type ChaosScenario } from "./chaos/scenarios.js";
import { inspectEndpoint } from "./diagnostics.js";
import { HttpRpcTransport } from "./transport/http.js";
import { encodeTopicSymbol } from "./resilience/topics.js";

const configSchema = z.record(z.string(), z.unknown());
const program = new Command()
  .name("soroban-rpc-chaos")
  .description("Deterministic Soroban RPC chaos and diagnostics")
  .showHelpAfterError();

program.command("proxy")
  .requiredOption("--upstream <url>")
  .option("--host <address>", "listen address", "127.0.0.1")
  .option("--port <number>", "listen port", "8000")
  .requiredOption("--scenario <name>", "stale-ledger|retention|rate-limit|timeout")
  .option("--config <json>", "scenario configuration", "{}")
  .action(async (options: { upstream: string; host: string; port: string; scenario: string; config: string }) => {
    const config = configSchema.parse(JSON.parse(options.config));
    const scenarios: Record<string, () => ChaosScenario> = {
      "stale-ledger": () => staleLedger(number(config.decrement, 1)),
      retention: () => retentionRejection(number(config.minimumLedger, 1)),
      "rate-limit": () => rateLimit({ everyNth: number(config.everyNth, 1), retryAfterMs: number(config.retryAfterMs, 1000) }),
      timeout: () => timeoutScenario({ delayMs: number(config.delayMs, 1000), neverResolve: config.neverResolve === true }),
    };
    const factory = scenarios[options.scenario];
    if (!factory) throw new Error(`Unknown scenario: ${options.scenario}`);
    const proxy = new ChaosProxy(new ChaosEngine(new HttpRpcTransport(options.upstream), [factory()]));
    const address = await proxy.listen(Number(options.port), options.host);
    process.stdout.write(`Chaos proxy listening on ${address.url}\n`);
    const close = async (): Promise<void> => { await proxy.close(); process.exitCode = 0; };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });

program.command("check")
  .argument("<url>")
  .option("--samples <number>", "ledger samples", "2")
  .action(async (url: string, options: { samples: string }) => {
    const result = await inspectEndpoint(new HttpRpcTransport(url), { samples: Number(options.samples) });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.healthy || result.regressed) process.exitCode = 1;
  });

program.command("encode-topic")
  .argument("<symbol>")
  .action((symbol: string) => { process.stdout.write(`${encodeTopicSymbol(symbol)}\n`); });

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

program.parseAsync().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Command failed"}\n`);
  process.exitCode = 1;
});
