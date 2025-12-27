/**
 * Fastify 服务器（重构后）
 *
 * 说明：
 * - 删除了所有服务实例化（改用函数式服务）
 * - 删除了 Session 管理（使用 URL 参数认证）
 * - 简化了路由注册
 */

import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import { getEnvConfig } from './utils/env';
import { initDatabase } from './db';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { registerPodcastsRoutes } from './routes/podcasts.routes';
import { registerEpisodesRoutes } from './routes/episodes.routes';
import { registerFeedRoutes } from './routes/feed.routes';
import { registerBilibiliRoutes } from './routes/bilibili.routes';
import { registerFileManagementRoutes } from './routes/file-management.routes';
import { registerAudioRoutes } from './routes/audio.routes';

export class PodcastServer {
  private server: FastifyInstance;
  private audioDir: string;
  private baseUrl: string;
  private port: number;

  constructor(audioDir: string, port: number) {
    this.audioDir = path.resolve(audioDir);
    this.port = port;
    const config = getEnvConfig();
    this.baseUrl = config.BASE_URL;

    this.server = fastify({
      logger: true,
    });
  }

  /**
   * 初始化服务器
   */
  public async initialize(): Promise<void> {
    try {
      // ====== 初始化数据库 ======
      await initDatabase();

      // ====== 注册插件 ======

      // 注册 CORS 支持
      await this.server.register(fastifyCors, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      });

      // 注册 Multipart 支持（文件上传）
      await this.server.register(fastifyMultipart, {
        limits: {
          fileSize: 500 * 1024 * 1024, // 500MB
        },
      });

      // 注册错误处理中间件
      this.server.setErrorHandler(errorHandler);

      // ====== 注册静态文件服务 ======

      // Web 界面和图片资源
      await this.server.register(fastifyStatic, {
        root: path.join(__dirname, '../assets'),
        prefix: '/',
        decorateReply: false,
      });

      // ====== 注册路由 ======

      // 认证路由（登录验证）
      await authRoutes(this.server);

      // 音频文件访问路由（支持用户隔离）
      await registerAudioRoutes(this.server);

      // 播客路由（CRUD）
      await registerPodcastsRoutes(this.server);

      // 剧集路由（元数据管理）
      await registerEpisodesRoutes(this.server);

      // Feed 路由（公开访问）
      await registerFeedRoutes(this.server);

      // B 站下载路由（保留原有功能）
      await registerBilibiliRoutes(this.server);

      // 文件管理路由（上传、删除、重命名）
      await registerFileManagementRoutes(this.server);

      // 根路径重定向到 Web 界面
      this.server.get('/', async (request, reply) => {
        return reply.redirect('/web/index.html');
      });

      // ====== 显示启动信息 ======
      await this.displayStartupInfo();
    } catch (error) {
      this.server.log.error('Error initializing server:', error);
      throw error;
    }
  }

  /**
   * 显示启动信息
   */
  private async displayStartupInfo(): Promise<void> {
    try {
      const config = getEnvConfig();
      const isDev = process.env.NODE_ENV === 'development';

      console.log(`\n✓ 数据库已初始化`);
      console.log(`✓ 默认用户: admin / admin`);
      console.log(`✓ 服务器地址: ${this.baseUrl}`);

      if (!isDev) {
        // 生产环境
        console.log(`✓ Web 界面: ${this.baseUrl}/web/index.html`);
      } else {
        // 开发环境
        const vitePort = process.env.VITE_PORT || '3200';
        console.log(`✓ Web 界面: http://${config.HOST}:${vitePort}/web/ (Vite 开发服务器)`);
      }
      console.log('');
    } catch (error) {
      this.server.log.error('Error displaying startup info:', error);
    }
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    try {
      const address = await this.server.listen({
        port: this.port,
        host: '0.0.0.0',
      });
      this.server.log.info(`Server listening at ${address}`);
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }

  /**
   * 停止服务器
   */
  public async stop(): Promise<void> {
    await this.server.close();
  }

  /**
   * 获取音频目录路径
   */
  public get audioDirectory(): string {
    return this.audioDir;
  }
}

