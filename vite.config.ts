import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
        character: resolve(__dirname, 'character-select.html'),
        settings: resolve(__dirname, 'settings.html'),
        credits: resolve(__dirname, 'credits.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    open: '/index.html',
  },
});
