import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: "/",
  server: {
    host: "localhost",
    port: 5173,
  },
}));
