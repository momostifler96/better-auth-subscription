import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Le client Better Auth vit dans le node_modules du dépôt parent : on force
// une seule copie de React pour éviter les hooks invalides.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api/auth": {
        target: "http://localhost:3100",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
