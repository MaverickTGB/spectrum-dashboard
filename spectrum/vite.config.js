import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    // Railway sets its own host; allow it explicitly.
    allowedHosts: true,
  },
});
