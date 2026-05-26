import path from "node:path";
import { homedir } from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const downloads = path.join(homedir(), "Downloads");

export default defineConfig({
  plugins: [react()],
  cacheDir: ".vite",
  resolve: {
    alias: {
      "@local": downloads,
    },
  },
  server: {
    fs: {
      allow: [downloads, path.resolve(__dirname, "..")],
    },
  },
  assetsInclude: ["**/*.jpg", "**/*.jpeg", "**/*.png", "**/*.webp"],
  build: {
    target: "es2020",
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});
