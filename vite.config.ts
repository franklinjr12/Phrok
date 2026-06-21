import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        mapEditor: resolve(rootDir, "tools/mapEditor/index.html"),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
