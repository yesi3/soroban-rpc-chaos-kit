import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { ChaosEngine } from "./engine.js";
import type { JsonRpcRequest, JsonValue } from "../types.js";

export interface ProxyAddress {
  host: string;
  port: number;
  url: string;
}

/** Local JSON-RPC proxy backed by a ChaosEngine. */
export class ChaosProxy {
  private server: Server | undefined;
  constructor(private readonly engine: ChaosEngine) {}

  /** Start listening and return the bound address. */
  async listen(port = 0, host = "127.0.0.1"): Promise<ProxyAddress> {
    if (this.server) throw new Error("Proxy is already listening");
    this.server = createServer(async (request, response) => {
      response.setHeader("content-type", "application/json");
      if (request.method === "GET" && request.url === "/health") {
        response.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if (request.method === "GET" && request.url === "/__chaos/stats") {
        response.end(JSON.stringify(this.engine.stats()));
        return;
      }
      if (request.method !== "POST") {
        response.statusCode = 404;
        response.end(JSON.stringify({ error: "not found" }));
        return;
      }
      try {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
          const buffer = Buffer.from(chunk as Uint8Array);
          size += buffer.length;
          if (size > 1_000_000) throw new Error("Request too large");
          chunks.push(buffer);
        }
        const rpc = JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonRpcRequest;
        const result = await this.engine.request(rpc.method, rpc.params as JsonValue | undefined);
        response.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "RPC proxy failure";
        response.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32_000, message } }));
      }
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, host, resolve);
    });
    const address = this.server.address() as AddressInfo;
    return { host: address.address, port: address.port, url: `http://${host}:${address.port}` };
  }

  /** Stop accepting requests. */
  async close(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
