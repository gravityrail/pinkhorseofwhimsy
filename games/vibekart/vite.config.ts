import { defineConfig } from 'vite';

export default defineConfig({
  // server: {
  //   open: true, // Automatically open in browser
  // },
  build: {
    chunkSizeWarningLimit: 1000, // kBs
  },
});
