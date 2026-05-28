import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000
  }
});
