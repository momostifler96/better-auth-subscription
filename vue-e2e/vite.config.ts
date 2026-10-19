import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // better-auth et le package better-subscriptions vivent dans le
    // node_modules du dépôt parent : une seule copie de Vue suffit.
    dedupe: ["vue", "better-auth", "@better-auth/core"],
  },
  server: {
    port: 5174,
    proxy: {
      "/api/auth": {
        target: "http://localhost:3200",
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
