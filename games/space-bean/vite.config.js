import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path is passed on the command line (see package.json `build`) so the game
// can be served from /space-bean/ in production while dev stays at /.
export default defineConfig({
  plugins: [react()],
});
