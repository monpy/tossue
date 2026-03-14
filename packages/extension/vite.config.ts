import { resolve } from "path";
import { defineConfig } from "vite";
import UnoCSS from "unocss/vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    UnoCSS(),
    preact(),
    crx({ manifest }),
  ],
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
    rollupOptions: {
      input: {
        devtoolsPanel: resolve(__dirname, "src/devtools/panel/index.html"),
        injected: resolve(__dirname, "src/content/injected.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "injected") {
            return "src/content/injected.js";
          }
          return "[name]-[hash].js";
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      host: "localhost",
      port: 5173,
    },
  },
});
