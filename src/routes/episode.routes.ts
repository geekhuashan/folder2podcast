import { FastifyInstance } from 'fastify';
import { PodcastService } from '../services/podcast.service';
import fs from 'fs-extra';
import path from 'path';
import { getEnvConfig } from '../utils/env';
import { EpisodesConfig, EpisodeMetadata } from '../types';

/**
 * 注册剧集管理 API 路由
 * @param server Fastify 实例
 * @param podcastService PodcastService 实例
 */
export async function registerEpisodeRoutes(
    server: FastifyInstance,
    podcastService: PodcastService
): Promise<void> {
    const { AUDIO_DIR } = getEnvConfig();

    /**
     * GET /api/v2/podcasts/:dirName/episodes
     * 获取播客的剧集列表和元数据
     */
    server.get<{
        Params: { dirName: string };
    }>('/api/v2/podcasts/:dirName/episodes', async (request, reply) => {
        const { dirName } = request.params;
        const podcastPath = path.join(AUDIO_DIR, dirName);

        // 验证播客目录是否存在
        if (!await fs.pathExists(podcastPath)) {
            return reply.status(404).send({
                error: 'Podcast not found',
                message: `播客 "${dirName}" 不存在`
            });
        }

        // 扫描播客
        const podcast = await podcastService.scanPodcast(podcastPath);

        // 读取 episodes.json（如果存在）
        const episodesConfigPath = path.join(podcastPath, 'episodes.json');
        let episodesConfig: EpisodesConfig | null = null;

        if (await fs.pathExists(episodesConfigPath)) {
            try {
                const content = await fs.readFile(episodesConfigPath, 'utf-8');
                episodesConfig = JSON.parse(content);
            } catch (error) {
                console.warn(`Failed to read episodes.json for ${dirName}:`, error);
            }
        }

        // 返回剧集列表，包含元数据
        const episodes = podcast.episodes.map(episode => ({
            fileName: episode.fileName,
            title: episode.title,
            description: episode.description || '',
            pubDate: episode.pubDate.toISOString(),
            imageUrl: episode.imageUrl || '',
            // 原始元数据（来自 episodes.json）
            metadata: episodesConfig?.episodes?.[episode.fileName] || null
        }));

        reply.send({
            data: episodes,
            metadata: {
                version: '2.0',
                timestamp: new Date().toISOString(),
                count: episodes.length
            }
        });
    });

    /**
     * PUT /api/v2/podcasts/:dirName/episodes/metadata
     * 更新单个剧集的元数据
     */
    server.put<{
        Params: { dirName: string };
        Body: {
            fileName: string;
            metadata: EpisodeMetadata;
        };
    }>('/api/v2/podcasts/:dirName/episodes/metadata', async (request, reply) => {
        const { dirName } = request.params;
        const { fileName, metadata } = request.body;

        // 验证参数
        if (!fileName) {
            return reply.status(400).send({
                error: 'Invalid request',
                message: '缺少 fileName 参数'
            });
        }

        const podcastPath = path.join(AUDIO_DIR, dirName);
        const episodesConfigPath = path.join(podcastPath, 'episodes.json');

        // 验证播客目录是否存在
        if (!await fs.pathExists(podcastPath)) {
            return reply.status(404).send({
                error: 'Podcast not found',
                message: `播客 "${dirName}" 不存在`
            });
        }

        // 读取现有的 episodes.json 或创建新的
        let episodesConfig: EpisodesConfig = { episodes: {} };

        if (await fs.pathExists(episodesConfigPath)) {
            try {
                const content = await fs.readFile(episodesConfigPath, 'utf-8');
                episodesConfig = JSON.parse(content);
            } catch (error) {
                console.warn('Failed to read existing episodes.json, creating new:', error);
            }
        }

        // 更新元数据
        if (!episodesConfig.episodes) {
            episodesConfig.episodes = {};
        }

        // 如果元数据为空对象，则删除该剧集的配置
        if (Object.keys(metadata).length === 0) {
            delete episodesConfig.episodes[fileName];
        } else {
            // 清理空字符串字段
            const cleanedMetadata: EpisodeMetadata = {};
            if (metadata.title?.trim()) cleanedMetadata.title = metadata.title.trim();
            if (metadata.description?.trim()) cleanedMetadata.description = metadata.description.trim();
            if (metadata.image?.trim()) cleanedMetadata.image = metadata.image.trim();
            if (metadata.pubDate?.trim()) cleanedMetadata.pubDate = metadata.pubDate.trim();

            episodesConfig.episodes[fileName] = cleanedMetadata;
        }

        // 写入文件
        await fs.writeFile(
            episodesConfigPath,
            JSON.stringify(episodesConfig, null, 2),
            'utf-8'
        );

        reply.send({
            success: true,
            message: '元数据更新成功'
        });
    });

    /**
     * DELETE /api/v2/podcasts/:dirName/episodes/:fileName/metadata
     * 删除剧集的元数据
     */
    server.delete<{
        Params: { dirName: string; fileName: string };
    }>('/api/v2/podcasts/:dirName/episodes/:fileName/metadata', async (request, reply) => {
        const { dirName, fileName } = request.params;

        const podcastPath = path.join(AUDIO_DIR, dirName);
        const episodesConfigPath = path.join(podcastPath, 'episodes.json');

        // 验证播客目录是否存在
        if (!await fs.pathExists(podcastPath)) {
            return reply.status(404).send({
                error: 'Podcast not found',
                message: `播客 "${dirName}" 不存在`
            });
        }

        // 读取 episodes.json
        if (!await fs.pathExists(episodesConfigPath)) {
            return reply.send({
                success: true,
                message: '元数据已删除'
            });
        }

        try {
            const content = await fs.readFile(episodesConfigPath, 'utf-8');
            const episodesConfig: EpisodesConfig = JSON.parse(content);

            // 删除指定剧集的元数据
            if (episodesConfig.episodes && episodesConfig.episodes[fileName]) {
                delete episodesConfig.episodes[fileName];

                // 写回文件
                await fs.writeFile(
                    episodesConfigPath,
                    JSON.stringify(episodesConfig, null, 2),
                    'utf-8'
                );
            }

            reply.send({
                success: true,
                message: '元数据已删除'
            });
        } catch (error) {
            console.error('Failed to delete episode metadata:', error);
            reply.status(500).send({
                error: 'Internal server error',
                message: '删除元数据失败'
            });
        }
    });

    /**
     * POST /api/v2/podcasts/:dirName/episodes/:fileName/cover
     * 上传剧集封面
     */
    server.post<{
        Params: { dirName: string; fileName: string };
    }>('/api/v2/podcasts/:dirName/episodes/:fileName/cover', async (request, reply) => {
        const { dirName, fileName } = request.params;

        const podcastPath = path.join(AUDIO_DIR, dirName);

        // 验证播客目录是否存在
        if (!await fs.pathExists(podcastPath)) {
            return reply.status(404).send({
                error: 'Podcast not found',
                message: `播客 "${dirName}" 不存在`
            });
        }

        // 获取上传的文件
        const data = await request.file();

        if (!data) {
            return reply.status(400).send({
                error: 'Invalid request',
                message: '未提供封面文件'
            });
        }

        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(data.mimetype)) {
            return reply.status(400).send({
                error: 'Invalid file type',
                message: '仅支持 JPG、JPEG、PNG 格式的图片'
            });
        }

        // 生成封面文件名（使用音频文件名，但扩展名改为图片格式）
        const audioBaseName = path.parse(fileName).name;
        const ext = data.mimetype === 'image/png' ? 'png' : 'jpg';
        const coverFileName = `ep-${audioBaseName}.${ext}`;
        const coverPath = path.join(podcastPath, coverFileName);

        // 保存文件
        try {
            const buffer = await data.toBuffer();
            await fs.writeFile(coverPath, buffer);

            reply.send({
                success: true,
                message: '封面上传成功',
                data: {
                    fileName: coverFileName,
                    path: coverPath
                }
            });
        } catch (error) {
            console.error('Failed to upload cover:', error);
            reply.status(500).send({
                error: 'Internal server error',
                message: '封面上传失败'
            });
        }
    });

    /**
     * DELETE /api/v2/podcasts/:dirName/episodes/:fileName/cover
     * 删除剧集封面
     */
    server.delete<{
        Params: { dirName: string; fileName: string };
    }>('/api/v2/podcasts/:dirName/episodes/:fileName/cover', async (request, reply) => {
        const { dirName, fileName } = request.params;

        const podcastPath = path.join(AUDIO_DIR, dirName);

        // 验证播客目录是否存在
        if (!await fs.pathExists(podcastPath)) {
            return reply.status(404).send({
                error: 'Podcast not found',
                message: `播客 "${dirName}" 不存在`
            });
        }

        // 查找剧集封面文件
        const audioBaseName = path.parse(fileName).name;
        const possibleExtensions = ['jpg', 'jpeg', 'png'];
        let coverDeleted = false;

        for (const ext of possibleExtensions) {
            const coverFileName = `ep-${audioBaseName}.${ext}`;
            const coverPath = path.join(podcastPath, coverFileName);

            if (await fs.pathExists(coverPath)) {
                await fs.remove(coverPath);
                coverDeleted = true;
                break;
            }
        }

        if (coverDeleted) {
            reply.send({
                success: true,
                message: '封面已删除'
            });
        } else {
            reply.send({
                success: true,
                message: '未找到封面文件'
            });
        }
    });
}
