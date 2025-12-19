import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/web/',
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true
      },
      '/feeds': {
        target: 'http://localhost:3100',
        changeOrigin: true
      },
      '/audio': {
        target: 'http://localhost:3100',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../assets/web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
});
