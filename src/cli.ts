#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { z } from "zod";
import { ChaosEngine } from "./chaos/engine.js";
import { ChaosProxy } from "./chaos/proxy.js";
import {
  PROXY_SCENARIO_NAMES,
  createProxyScenario,
  type ProxyScenarioName,
} from "./chaos/scenarios.js";
import { inspectEndpoint } from "./diagnostics.js";
import { encodeTopicSymbol } from "./resilience/topics.js";
import { HttpRpcTransport } from "./transport/http.js";

const packagePath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const packageVersion = (JSON.parse(readFileSync(packagePath, "utf8")) as { version: string }).version;

const configSchema = z.record(z.string(), z.unknown());
const program = new Command()
  .name("soroban-rpc-chaos")
  .description("Deterministic Soroban RPC chaos and diagnostics")
  .version(packageVersion)
  .showHelpAfterError();

program
  .command("scenarios")
  .description("List scenario names accepted by the local chaos proxy")
  .option("--json", "print a JSON array", false)
  .action((options: { json?: boolean }) => {
    if (options.json) {
      process.stdout.write(`${JSON.stringify([...PROXY_SCENARIO_NAMES])}\n`);
      return;
    }
    for (const name of PROXY_SCENARIO_NAMES) process.stdout.write(`${name}\n`);
  });

program
  .command("proxy")
  .requiredOption("--upstream <url>")
  .option("--host <address>", "listen address", "127.0.0.1")
  .option("--port <number>", "listen port", "8000")
  .requiredOption("--scenario <name>", PROXY_SCENARIO_NAMES.join("|"))
  .option("--config <json>", "scenario configuration", "{}")
  .action(async (options: {
    upstream: string;
    host: string;
    port: string;
    scenario: string;
    config: string;
  }) => {
    const config = configSchema.parse(JSON.parse(options.config));
    if (!(PROXY_SCENARIO_NAMES as readonly string[]).includes(options.scenario)) {
      throw new Error(
        `Unknown scenario: ${options.scenario}. Supported: ${PROXY_SCENARIO_NAMES.join(", ")}`,
      );
    }
    const scenario = createProxyScenario(options.scenario as ProxyScenarioName, config);
    const proxy = new ChaosProxy(new ChaosEngine(new HttpRpcTransport(options.upstream), [scenario]));
    const address = await proxy.listen(Number(options.port), options.host);
    process.stdout.write(`Chaos proxy listening on ${address.url}\n`);
    const close = async (): Promise<void> => {
      await proxy.close();
      process.exitCode = 0;
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });

program
  .command("check")
  .argument("<url>")
  .option("--samples <number>", "ledger samples", "2")
  .action(async (url: string, options: { samples: string }) => {
    const result = await inspectEndpoint(new HttpRpcTransport(url), {
      samples: Number(options.samples),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.healthy || result.regressed) process.exitCode = 1;
  });

program
  .command("encode-topic")
  .argument("<symbol>")
  .action((symbol: string) => {
    process.stdout.write(`${encodeTopicSymbol(symbol)}\n`);
  });

await program.parseAsync().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Command failed"}\n`);
  process.exitCode = 1;
});
