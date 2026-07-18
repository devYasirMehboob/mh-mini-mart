import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? "/mh-mini-mart/frontend/dist/" : "/",
  server: {
    host: "localhost",
    port: 5173,
  },
}));
