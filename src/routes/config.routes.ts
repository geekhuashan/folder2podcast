import { FastifyInstance } from 'fastify';
import { getEnvConfig } from '../utils/env';

function ensureProtocol(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  return url;
}

export async function registerConfigRoutes(server: FastifyInstance): Promise<void> {
  server.get('/api/config', async (request) => {
    const { BASE_URL } = getEnvConfig();
    const hostHeader = request.headers.host || 'localhost:3100';
    const protocolHeader = (request.headers['x-forwarded-proto'] as string) || 'http';
    const fallbackBaseUrl = `${protocolHeader}://${hostHeader}`;
    const baseUrl = ensureProtocol(BASE_URL || fallbackBaseUrl).replace(/\/$/, '');
    const isDev = process.env.VITE_DEV_SERVER === 'true';
    const vitePort = process.env.VITE_PORT || '3200';

    let webBaseUrl = baseUrl;
    let webAppUrl = '/';
    let webLandingUrl = '/about';

    if (isDev) {
      // 开发环境：指向 Vite 开发服务器
      try {
        const url = new URL(baseUrl);
        url.port = vitePort;
        webBaseUrl = url.toString().replace(/\/$/, '');
      } catch {
        webBaseUrl = `http://localhost:${vitePort}`;
      }
      webAppUrl = `${webBaseUrl}/app.html`;
      webLandingUrl = `${webBaseUrl}/about.html`;
    }

    return {
      data: {
        baseUrl,
        webBaseUrl,
        webAppUrl,
        webLandingUrl,
        feedBaseUrl: `${baseUrl}/feeds`,
      },
    };
  });
}
