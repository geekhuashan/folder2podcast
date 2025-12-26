import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 从环境变量读取配置
const BACKEND_PORT = process.env.PORT || '3100';
const BACKEND_HOST = process.env.HOST || 'localhost';
const VITE_PORT = process.env.VITE_PORT || '3200';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/web/',
  // 定义全局常量，将后端 URL 传递给前端
  define: {
    __BACKEND_URL__: JSON.stringify(BACKEND_URL)
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: parseInt(VITE_PORT),
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true
      },
      '/feeds': {
        target: BACKEND_URL,
        changeOrigin: true
      },
      '/audio': {
        target: BACKEND_URL,
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
