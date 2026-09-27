import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL("../../artifacts/v12-operational-telemetry/sidecar-dist", import.meta.url)),
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: fileURLToPath(new URL("./telemetry-observer.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "telemetry-observer.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
