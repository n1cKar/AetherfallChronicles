import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
  server: { port: 5173, open: '/index.html' },
});
