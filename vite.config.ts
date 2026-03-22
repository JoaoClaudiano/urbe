import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/urbe/", // IMPORTANTE pro GitHub Pages
  plugins: [react()],
});
