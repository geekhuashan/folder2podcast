import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { getEnvConfig } from './utils/env';
import { ConfigService } from './services/config.service';
import { PodcastService } from './services/podcast.service';
import { FeedService } from './services/feed.service';
import { errorHandler } from './middleware/error.middleware';
import { registerApiRoutes } from './routes/api.routes';
import { registerFeedRoutes } from './routes/feed.routes';

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
    }

    /**
     * 初始化服务器
     */
    public async initialize(): Promise<void> {
        try {
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

            if (podcasts.length === 0) {
                console.log('\n未发现任何播客源!请确保音频文件夹结构正确。');
                return;
            }

            console.log('\n发现以下播客源:');
            console.log('='.repeat(50));

            for (const podcast of podcasts) {
                const episodeCount = podcast.episodes.length;
                const coverInfo = podcast.coverPath ? '✓' : '✗';

                console.log(`
  ${podcast.config.title}
  ├── 描述: ${podcast.config.description}
  ├── 作者: ${podcast.config.author}
  ├── 语言: ${podcast.config.language}
  ├── 封面: ${coverInfo}
  ├── 剧集数: ${episodeCount}
  ├── 文件夹名: ${podcast.dirName}
  └── RSS地址: ${this.baseUrl}/feeds/${encodeURIComponent(podcast.dirName)}.xml`);
                console.log('='.repeat(50));
            }

            console.log(`\n总共发现 ${podcasts.length} 个播客源`);
            console.log(`服务器地址: ${this.baseUrl}`);
            console.log('API端点:');
            console.log('  - V2 API: /api/v2/podcasts');
            console.log('  - V1 兼容: /podcasts\n');
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
