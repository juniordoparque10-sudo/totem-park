import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./telemetry-observer.js", import.meta.url));
const outDir = fileURLToPath(new URL("../artifacts/binary-sealed-telemetry/sidecar-dist", import.meta.url));

export default defineConfig({
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    minify: true,
    lib: { entry, formats: ["es"], fileName: () => "telemetry-observer.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
