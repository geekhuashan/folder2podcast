import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 从环境变量读取配置
const VITE_PORT = process.env.VITE_PORT || '3200';

// 确保后端 URL 是有效的（proxy target 需要完整 URL，包括协议和端口）
const BASE_URL_RAW = process.env.BASE_URL || 'localhost:3100';
let BACKEND_URL = BASE_URL_RAW;

// 如果没有协议，添加 http://
if (!BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
  BACKEND_URL = `http://${BACKEND_URL}`;
}

// 如果没有端口，添加默认端口 3100
if (!BACKEND_URL.includes(':3100') && !BACKEND_URL.match(/:\d+$/)) {
  const url = new URL(BACKEND_URL);
  url.port = '3100';
  BACKEND_URL = url.toString();
}

console.log('[Vite Config] BACKEND_URL:', BACKEND_URL);

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [
      solidPlugin(),
      {
        name: 'dev-root-redirect',
        configureServer(server) {
          if (!isDev) return;
          server.middlewares.use((req, res, next) => {
            if (req.url === '/') {
              res.statusCode = 302;
              res.setHeader('Location', '/app.html');
              res.end();
              return;
            }
            next();
          });
        }
      }
    ],
    base: isDev ? '/' : '/web/',
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
          main: path.resolve(__dirname, 'index.html'),
          app: path.resolve(__dirname, 'app.html')
        }
      }
    }
  };
});
