/**
 * 剧集路由（重构后 - 使用统一数据源）
 *
 * 说明：
 * - ✅ 使用统一的数据生成服务（generatePodcastFeedData）
 * - ✅ 确保与 RSS Feed 的数据完全一致
 * - 所有操作需要登录（requireAuth 中间件）
 * - 支持权限检查
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware';
import { getCurrentUser } from '../utils/auth';
import { updateEpisodeMetadata, deleteEpisodeMetadata } from '../services/episode';
import { generatePodcastFeedData } from '../services/feed-data.service';
import { getEpisodeCoverUrl } from '../utils/url';
import path from 'path';
import fs from 'fs-extra';
import { getEnvConfig } from '../utils/env';
import { db } from '../db';
import { episodes as episodesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

const { AUDIO_DIR } = getEnvConfig();

/**
 * 注册剧集路由
 */
export async function registerEpisodesRoutes(server: FastifyInstance) {
  /**
   * 获取播客的剧集列表
   * GET /api/podcasts/:id/episodes
   *
   * 说明：
   * - 需要登录
   * - ✅ 调用统一数据源，确保与 RSS Feed 一致
   * - 返回包含自定义元数据的剧集列表
   */
  server.get<{ Params: { id: string } }>(
    '/api/podcasts/:id/episodes',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const podcastId = request.params.id;

        // ✅ 调用统一数据生成服务（与 RSS Feed 完全相同）
        const feedData = await generatePodcastFeedData(podcastId);

        // 返回剧集列表（已包含完整的 imageUrl 和 audioUrl）
        return {
          data: feedData.episodes,
          count: feedData.episodes.length,
        };
      } catch (error: any) {
        console.error('[剧集路由] 获取剧集列表失败:', error);
        return reply.code(500).send({ error: error.message || '获取剧集列表失败' });
      }
    }
  );

  /**
   * 更新剧集元数据
   * PATCH /api/podcasts/:id/episodes/:fileName
   *
   * 说明：
   * - 需要登录
   * - 只能更新自己播客的剧集
   * - 支持更新 title, description, pubDate, coverUrl
   */
  server.patch<{
    Params: { id: string; fileName: string };
    Body: { title?: string; description?: string; pubDate?: string; coverUrl?: string };
  }>(
    '/api/podcasts/:id/episodes/:fileName',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      // 解码文件名
      const decodedFileName = decodeURIComponent(fileName);

      try {
        const updated = await updateEpisodeMetadata(id, decodedFileName, user.id, request.body);
        return { data: updated };
      } catch (error: any) {
        return reply.code(403).send({ error: error.message });
      }
    }
  );

  /**
   * 删除剧集的自定义元数据
   * DELETE /api/podcasts/:id/episodes/:fileName
   *
   * 说明：
   * - 需要登录
   * - 重置剧集的自定义元数据（title, description, pubDate, coverUrl）
   * - 不删除音频文件，只清除数据库中的自定义字段
   */
  server.delete<{ Params: { id: string; fileName: string } }>(
    '/api/podcasts/:id/episodes/:fileName',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      // 解码文件名
      const decodedFileName = decodeURIComponent(fileName);

      try {
        await deleteEpisodeMetadata(id, decodedFileName, user.id);
        return { success: true };
      } catch (error: any) {
        return reply.code(403).send({ error: error.message });
      }
    }
  );

  /**
   * 上传剧集封面
   * POST /api/podcasts/:id/episodes/:fileName/cover
   *
   * 说明：
   * - 需要登录
   * - 上传剧集封面图片
   * - 自动生成文件名: {音频文件名（不含扩展名）}.{图片扩展名}（与音频文件同名）
   * - 更新数据库中的 coverUrl 字段
   */
  server.post<{ Params: { id: string; fileName: string } }>(
    '/api/podcasts/:id/episodes/:fileName/cover',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      try {
        // 解码文件名
        const decodedFileName = decodeURIComponent(fileName);

        // 解析 podcastId
        const [userId, dirName] = id.split(':');
        if (userId !== user.id) {
          return reply.code(403).send({ error: '无权限操作此播客' });
        }

        // 获取上传的文件
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: '未找到上传的文件' });
        }

        // 验证文件类型
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          return reply.code(400).send({ error: '不支持的图片格式，仅支持 JPG、PNG、GIF、WebP' });
        }

        // 生成封面文件名: {音频文件名（不含扩展名）}.{图片扩展名}
        const audioBaseName = path.basename(decodedFileName, path.extname(decodedFileName));
        const imageExt = path.extname(data.filename);
        const coverFileName = `${audioBaseName}${imageExt}`;

        // 目标路径
        const podcastDir = path.join(AUDIO_DIR, userId, dirName);
        const coverPath = path.join(podcastDir, coverFileName);

        // 确保目录存在
        await fs.ensureDir(podcastDir);

        // 保存文件
        await fs.writeFile(coverPath, await data.toBuffer());

        // 更新数据库
        const episodeId = `${id}:${decodedFileName}`;
        await db
          .update(episodesTable)
          .set({ coverUrl: coverFileName, updatedAt: new Date() })
          .where(eq(episodesTable.id, episodeId));

        return {
          success: true,
          coverFileName,
          coverUrl: getEpisodeCoverUrl(dirName, coverFileName)
        };
      } catch (error: any) {
        console.error('上传剧集封面失败:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * 删除剧集封面
   * DELETE /api/podcasts/:id/episodes/:fileName/cover
   *
   * 说明：
   * - 需要登录
   * - 删除剧集封面文件
   * - 清除数据库中的 coverUrl 字段
   */
  server.delete<{ Params: { id: string; fileName: string } }>(
    '/api/podcasts/:id/episodes/:fileName/cover',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      try {
        // 解码文件名
        const decodedFileName = decodeURIComponent(fileName);

        // 解析 podcastId
        const [userId, dirName] = id.split(':');
        if (userId !== user.id) {
          return reply.code(403).send({ error: '无权限操作此播客' });
        }

        // 查询剧集信息
        const episodeId = `${id}:${decodedFileName}`;
        const episode = await db
          .select()
          .from(episodesTable)
          .where(eq(episodesTable.id, episodeId))
          .get();

        if (!episode || !episode.coverUrl) {
          return reply.code(404).send({ error: '剧集封面不存在' });
        }

        // 删除封面文件
        const podcastDir = path.join(AUDIO_DIR, userId, dirName);
        const coverPath = path.join(podcastDir, episode.coverUrl);

        if (await fs.pathExists(coverPath)) {
          await fs.remove(coverPath);
        }

        // 清除数据库中的 coverUrl
        await db
          .update(episodesTable)
          .set({ coverUrl: null, updatedAt: new Date() })
          .where(eq(episodesTable.id, episodeId));

        return { success: true };
      } catch (error: any) {
        console.error('删除剧集封面失败:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}
