import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/chaos/index.ts", "src/resilience/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
