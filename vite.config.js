import { defineConfig } from 'vite';

// base: './' makes the build work from any sub-folder (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 3000
  }
});
