import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import { getEnvConfig } from './utils/env';
import { ConfigService } from './services/config.service';
import { PodcastService } from './services/podcast.service';
import { FeedService } from './services/feed.service';
import { errorHandler } from './middleware/error.middleware';
import { registerApiRoutes } from './routes/api.routes';
import { registerFeedRoutes } from './routes/feed.routes';
import { registerManagementRoutes } from './routes/management.routes';
import { registerBilibiliRoutes } from './routes/bilibili.routes';
import { BilibiliDownloadService } from './services/bilibili-download.service';

// 设置默认封面路径为assets中的图片
const DEFAULT_COVER = '/image/default-cover.png';

export class PodcastServer {
    private server: FastifyInstance;
    private audioDir: string;
    private baseUrl: string;
    private port: number;

    // 服务实例
    private configService: ConfigService;
    private podcastService: PodcastService;
    private feedService: FeedService;
    private bilibiliService: BilibiliDownloadService;

    constructor(audioDir: string, port: number) {
        this.audioDir = path.resolve(audioDir);
        this.port = port;
        const config = getEnvConfig();
        this.baseUrl = config.BASE_URL;

        this.server = fastify({
            logger: true
        });

        // 创建服务实例 (直接实例化,不使用依赖注入)
        this.configService = new ConfigService();
        this.podcastService = new PodcastService();
        this.feedService = new FeedService();
        this.bilibiliService = new BilibiliDownloadService();
    }

    /**
     * 初始化服务器
     */
    public async initialize(): Promise<void> {
        try {
            // 注册 CORS 支持(允许全部跨域访问)
            await this.server.register(fastifyCors, {
                origin: true, // 允许所有来源
                credentials: true, // 允许携带凭证
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
            });

            // 注册错误处理中间件
            this.server.setErrorHandler(errorHandler);

            // 注册静态文件服务 - assets (Web界面和图片资源)
            await this.server.register(fastifyStatic, {
                root: path.join(__dirname, '../assets'),
                prefix: '/',
                decorateReply: false
            });

            // 注册静态文件服务 - audio (音频文件)
            await this.server.register(fastifyStatic, {
                root: this.audioDir,
                prefix: '/audio/',
                decorateReply: false
            });

            // 注册 API 路由
            await registerApiRoutes(this.server, this.podcastService);

            // 注册 Feed 路由
            await registerFeedRoutes(this.server, this.podcastService, this.feedService);

            // 注册管理 API 路由(需要认证)
            await registerManagementRoutes(this.server, this.podcastService, this.feedService);

            // 注册 B 站下载路由
            await registerBilibiliRoutes(this.server, this.bilibiliService, this.feedService);

            // 添加根路径重定向
            this.server.get('/', async (request, reply) => {
                return reply.redirect('/web/index.html');
            });

            // 显示启动信息
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
            const podcasts = await this.podcastService.scanAllPodcasts();
            const config = getEnvConfig();
            const isDev = process.env.NODE_ENV === 'development';

            console.log(`\n✓ 已发现 ${podcasts.length} 个播客源`);
            console.log(`✓ 服务器地址: ${this.baseUrl}`);

            if (!isDev) {
                // 生产环境：前端由后端服务器提供
                console.log(`✓ Web 界面: ${this.baseUrl}/web/index.html`);
            } else {
                // 开发环境：前端由 Vite 开发服务器提供
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
                host: '0.0.0.0'
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

    /**
     * 获取 FeedService 实例 (用于 watcher 清除缓存)
     */
    public get feed(): FeedService {
        return this.feedService;
    }
}
