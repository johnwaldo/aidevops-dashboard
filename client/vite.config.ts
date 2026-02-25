import path from "path"
import { readFileSync } from "fs"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Read version from root package.json (single source of truth)
const rootPkg = JSON.parse(readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __DASHBOARD_VERSION__: JSON.stringify(rootPkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
})
