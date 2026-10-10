import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Dev-only: the browser calls /api and /ws on the Vite origin, Vite forwards them to the backend.
  // Same-origin requests mean no CORS setup and a first-party refresh cookie.
  const target = env.DEV_PROXY_TARGET || "http://localhost:3000";
  const allowedHosts = env.DEV_ALLOWED_HOSTS?.split(",").map((h) => h.trim()).filter(Boolean);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      allowedHosts,
      proxy: {
        "/api": { target, changeOrigin: true },
        "/ws": { target, changeOrigin: true, ws: true },
      },
    },
    preview: { host: true, allowedHosts },
  };
});
