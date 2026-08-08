import { ChaosEngine, ChaosProxy, rateLimit } from "../src/chaos/index.js";
import { HttpRpcTransport } from "../src/transport/http.js";

const upstream = new HttpRpcTransport(process.env.SOROBAN_RPC_URL ?? "http://127.0.0.1:8000");
const proxy = new ChaosProxy(new ChaosEngine(upstream, [rateLimit({ everyNth: 5 })]));

await proxy.listen(9000);
