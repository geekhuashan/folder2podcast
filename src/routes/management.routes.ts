import { FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { PodcastService } from '../services/podcast.service';
import { FileManagementService } from '../services/file-management.service';
import { ConfigManagementService } from '../services/config-management.service';
import { FeedService } from '../services/feed.service';
import { apiKeyAuth } from '../middleware/auth.middleware';
import { PodcastConfigV2, PodcastMetadata, PodcastParsingOptions } from '../types';

/**
 * 注册管理 API 路由
 * 提供文件管理和配置管理的 RESTful 接口
 */
export async function registerManagementRoutes(
    server: FastifyInstance,
    podcastService: PodcastService,
    feedService: FeedService
) {
    const fileService = new FileManagementService();
    const configService = new ConfigManagementService();

    // 注册文件上传支持
    await server.register(fastifyMultipart, {
        limits: {
            fileSize: 500 * 1024 * 1024, // 500MB
            files: 1
        }
    });

    /**
     * POST /api/v2/manage/podcasts
     * 创建新播客
     * Body: {
     *   dirName: string,
     *   metadata: PodcastMetadata,
     *   parsing?: PodcastParsingOptions
     * }
     */
    server.post('/api/v2/manage/podcasts', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { dirName, metadata, parsing } = request.body as {
            dirName: string;
            metadata: PodcastMetadata;
            parsing?: PodcastParsingOptions;
        };

        if (!dirName || !metadata) {
            return reply.code(400).send({
                error: 'dirName and metadata are required'
            });
        }

        // 验证必需的元数据字段
        if (!metadata.title) {
            return reply.code(400).send({
                error: 'metadata.title is required'
            });
        }

        try {
            // 构建初始配置
            const initialConfig: PodcastConfigV2 = {
                metadata: {
                    title: metadata.title,
                    description: metadata.description || '暂无描述',
                    author: metadata.author || '未知作者',
                    email: metadata.email,
                    websiteUrl: metadata.websiteUrl,
                    language: metadata.language || 'zh-cn',
                    category: metadata.category || 'Podcast',
                    explicit: metadata.explicit || false
                },
                parsing: parsing || {
                    episodeNumberStrategy: 'prefix',
                    useMTime: false
                }
            };

            // 创建播客目录和配置文件
            await fileService.createPodcast(dirName, initialConfig);

            reply.code(201).send({
                message: 'Podcast created successfully',
                dirName,
                config: initialConfig
            });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to create podcast',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * GET /api/v2/manage/podcasts/:podcastDir/files
     * 列出播客目录下的所有文件
     */
    server.get('/api/v2/manage/podcasts/:podcastDir/files', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            const files = await fileService.listFiles(podcastDir);
            reply.send({
                data: files,
                metadata: {
                    podcast: podcastDir,
                    totalAudio: files.audio.length,
                    totalImages: files.images.length,
                    totalOthers: files.others.length
                }
            });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to list files',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * POST /api/v2/manage/podcasts/:podcastDir/files
     * 上传文件到播客目录
     */
    server.post('/api/v2/manage/podcasts/:podcastDir/files', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            await fileService.saveFile(podcastDir, data.filename, buffer);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({
                message: 'File uploaded successfully',
                filename: data.filename
            });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to upload file',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * DELETE /api/v2/manage/podcasts/:podcastDir/files/:fileName
     * 删除文件
     */
    server.delete('/api/v2/manage/podcasts/:podcastDir/files/:fileName', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir, fileName } = request.params as { podcastDir: string; fileName: string };

        try {
            await fileService.deleteFile(podcastDir, decodeURIComponent(fileName));

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'File deleted successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to delete file',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * PATCH /api/v2/manage/podcasts/:podcastDir/files/:fileName
     * 重命名文件
     * Body: { newName: string }
     */
    server.patch('/api/v2/manage/podcasts/:podcastDir/files/:fileName', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir, fileName } = request.params as { podcastDir: string; fileName: string };
        const { newName } = request.body as { newName: string };

        if (!newName) {
            return reply.code(400).send({ error: 'newName is required' });
        }

        try {
            await fileService.renameFile(podcastDir, decodeURIComponent(fileName), newName);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'File renamed successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to rename file',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * GET /api/v2/manage/podcasts/:podcastDir/config
     * 获取播客配置
     */
    server.get('/api/v2/manage/podcasts/:podcastDir/config', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            const config = await configService.getConfig(podcastDir);
            reply.send({
                data: config,
                exists: config !== null
            });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to get config',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * PUT /api/v2/manage/podcasts/:podcastDir/config
     * 更新播客配置(完整替换)
     * Body: PodcastConfigV2
     */
    server.put('/api/v2/manage/podcasts/:podcastDir/config', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };
        const config = request.body as PodcastConfigV2;

        try {
            await configService.updateConfig(podcastDir, config);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'Config updated successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to update config',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * PATCH /api/v2/manage/podcasts/:podcastDir/config/metadata
     * 更新播客元数据(部分更新)
     * Body: Partial<PodcastMetadata>
     */
    server.patch('/api/v2/manage/podcasts/:podcastDir/config/metadata', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };
        const metadata = request.body as Partial<PodcastMetadata>;

        try {
            await configService.updateMetadata(podcastDir, metadata);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'Metadata updated successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to update metadata',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * PATCH /api/v2/manage/podcasts/:podcastDir/config/parsing
     * 更新播客解析选项(部分更新)
     * Body: Partial<PodcastParsingOptions>
     */
    server.patch('/api/v2/manage/podcasts/:podcastDir/config/parsing', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };
        const parsing = request.body as Partial<PodcastParsingOptions>;

        try {
            await configService.updateParsingOptions(podcastDir, parsing);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'Parsing options updated successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to update parsing options',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * DELETE /api/v2/manage/podcasts/:podcastDir/config
     * 删除配置文件
     */
    server.delete('/api/v2/manage/podcasts/:podcastDir/config', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            await configService.deleteConfig(podcastDir);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'Config deleted successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to delete config',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * POST /api/v2/manage/podcasts/:podcastDir/refresh
     * 手动刷新播客缓存
     */
    server.post('/api/v2/manage/podcasts/:podcastDir/refresh', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            feedService.clearCache(podcastDir);
            reply.send({ message: 'Cache refreshed successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to refresh cache',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
