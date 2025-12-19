import { FastifyInstance } from 'fastify';
import { PodcastService } from '../services/podcast.service';
import { PodcastSourceV2 } from '../types';

// V2 API 响应格式
interface ApiResponseV2<T> {
    data: T;
    metadata: {
        version: string;
        timestamp: string;
        count?: number;
    };
}

// V1 兼容响应格式
interface ApiResponseV1 {
    podcasts: Array<{
        dirName: string;
        title: string;
        description: string;
        episodeCount: number;
    }>;
}

/**
 * 注册 API 路由
 * @param server Fastify 实例
 * @param podcastService PodcastService 实例
 */
export async function registerApiRoutes(
    server: FastifyInstance,
    podcastService: PodcastService
): Promise<void> {
    /**
     * GET /api/v2/podcasts
     * 获取所有播客列表 (V2 格式)
     */
    server.get('/api/v2/podcasts', async (request, reply) => {
        const podcasts = await podcastService.scanAllPodcasts();

        const data = podcasts.map(podcast => ({
            dirName: podcast.dirName,
            title: podcast.config.title,
            description: podcast.config.description,
            author: podcast.config.author,
            episodeCount: podcast.episodes.length,
            hasCover: !!podcast.coverPath,
            feedUrl: `/feeds/${encodeURIComponent(podcast.dirName)}.xml`
        }));

        const response: ApiResponseV2<typeof data> = {
            data,
            metadata: {
                version: '2.0',
                timestamp: new Date().toISOString(),
                count: data.length
            }
        };

        reply.send(response);
    });

    /**
     * GET /podcasts
     * 获取所有播客列表 (V1 兼容格式)
     */
    server.get('/podcasts', async (request, reply) => {
        const podcasts = await podcastService.scanAllPodcasts();

        const response: ApiResponseV1 = {
            podcasts: podcasts.map(podcast => ({
                dirName: podcast.dirName,
                title: podcast.config.title,
                description: podcast.config.description,
                episodeCount: podcast.episodes.length
            }))
        };

        reply.send(response);
    });
}
