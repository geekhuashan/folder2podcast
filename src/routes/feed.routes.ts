import { FastifyInstance } from 'fastify';
import path from 'path';
import { PodcastService } from '../services/podcast.service';
import { FeedService } from '../services/feed.service';
import { getEnvConfig } from '../utils/env';

/**
 * 注册 Feed 路由
 * @param server Fastify 实例
 * @param podcastService PodcastService 实例
 * @param feedService FeedService 实例
 */
export async function registerFeedRoutes(
    server: FastifyInstance,
    podcastService: PodcastService,
    feedService: FeedService
): Promise<void> {
    /**
     * GET /feeds/:dirName.xml
     * 动态生成并返回播客的 RSS feed
     */
    server.get<{
        Params: { dirName: string };
    }>('/feeds/:dirName.xml', async (request, reply) => {
        const { dirName } = request.params;

        // 解码目录名
        const decodedDirName = decodeURIComponent(dirName);

        // 构建播客路径
        const env = getEnvConfig();
        const podcastPath = path.join(env.AUDIO_DIR, decodedDirName);

        // 扫描播客
        const podcast = await podcastService.scanPodcast(podcastPath);

        // 生成 feed
        const xml = await feedService.generateFeed(podcast, {
            baseUrl: env.BASE_URL,
            defaultCover: `${env.BASE_URL}/default-cover.jpg`
        });

        // 设置响应头
        reply.type('application/xml; charset=utf-8');
        reply.send(xml);
    });
}
