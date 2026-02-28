import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["dev/dev.ts"],
  format: "esm",
  watch: ["dev", "src"],
  outDir: "build",
  onSuccess: "tsc && node build/dev.mjs",
  clean: true,
  platform: "node",
  dts: false,
  deps: {
    skipNodeModulesBundle: true
  }
});
