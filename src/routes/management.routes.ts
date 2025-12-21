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

    // 注册文件上传支持（允许多文件上传）
    await server.register(fastifyMultipart, {
        limits: {
            fileSize: 500 * 1024 * 1024, // 单文件最大 500MB
            files: 10 // 允许一次上传最多 10 个文件
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
     * GET /api/v2/manage/podcasts/:podcastDir
     * 获取播客详细信息（包含配置和文件列表）
     */
    server.get('/api/v2/manage/podcasts/:podcastDir', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            // 获取配置
            const config = await configService.getConfig(podcastDir);

            // 获取文件列表
            const files = await fileService.listFiles(podcastDir);

            reply.send({
                data: {
                    dirName: podcastDir,
                    config,
                    files
                },
                metadata: {
                    totalAudio: files.audio.length,
                    totalImages: files.images.length,
                    totalOthers: files.others.length
                }
            });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to get podcast',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * DELETE /api/v2/manage/podcasts/:podcastDir
     * 删除整个播客及其所有文件
     */
    server.delete('/api/v2/manage/podcasts/:podcastDir', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            // 删除播客目录
            await fileService.deletePodcast(podcastDir);

            // 清除缓存
            feedService.clearCache(podcastDir);

            reply.send({ message: 'Podcast deleted successfully' });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to delete podcast',
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
     * 上传单个或多个文件到播客目录
     */
    server.post('/api/v2/manage/podcasts/:podcastDir/files', {
        preHandler: apiKeyAuth
    }, async (request, reply) => {
        const { podcastDir } = request.params as { podcastDir: string };

        try {
            const files = await request.files();
            const uploadResults = [];
            let hasError = false;

            // 处理每个上传的文件
            for await (const file of files) {
                try {
                    const buffer = await file.toBuffer();
                    await fileService.saveFile(podcastDir, file.filename, buffer);
                    uploadResults.push({
                        filename: file.filename,
                        success: true
                    });
                } catch (error) {
                    hasError = true;
                    uploadResults.push({
                        filename: file.filename,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            // 检查是否有文件上传
            if (uploadResults.length === 0) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            // 清除缓存（只要有文件成功上传就清除）
            const successCount = uploadResults.filter(r => r.success).length;
            if (successCount > 0) {
                feedService.clearCache(podcastDir);
            }

            // 返回批量上传结果
            reply.send({
                message: hasError
                    ? `Uploaded ${successCount}/${uploadResults.length} files successfully`
                    : 'All files uploaded successfully',
                results: uploadResults,
                summary: {
                    total: uploadResults.length,
                    success: successCount,
                    failed: uploadResults.length - successCount
                }
            });
        } catch (error) {
            reply.code(500).send({
                error: 'Failed to upload files',
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
