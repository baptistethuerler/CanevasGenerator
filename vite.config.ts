import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "app",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./app/src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4321" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
