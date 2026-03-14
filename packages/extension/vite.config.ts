import { resolve } from "path";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest }),
  ],
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
    rollupOptions: {
      input: {
        devtoolsPanel: resolve(__dirname, "src/devtools/panel/index.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
