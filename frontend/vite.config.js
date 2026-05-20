import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Load .env from the project root (one level above /frontend)
  envDir: '../',
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // VITE_DEV_PROXY targets the local backend (vercel dev runs on 8888)
        // VITE_API_URL is only used by the browser bundle (must be a full URL or /api)
        target: process.env.VITE_DEV_PROXY || "http://localhost:8888",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    // Ensure the build doesn't fail on warnings
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
