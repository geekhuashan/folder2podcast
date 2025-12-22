/**
 * 剧集路由（重构后）
 *
 * 说明：
 * - 简化路由设计
 * - 所有操作需要登录（requireAuth 中间件）
 * - 支持权限检查
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware';
import { getCurrentUser } from '../utils/auth';
import { updateEpisodeMetadata, deleteEpisodeMetadata, getPodcastEpisodes } from '../services/episode';
import { scanPodcastEpisodes } from '../services/podcast';

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
   * - 自动扫描文件系统并同步到数据库
   * - 返回包含自定义元数据的剧集列表
   */
  server.get<{ Params: { id: string } }>(
    '/api/podcasts/:id/episodes',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        // 扫描并同步剧集
        const episodes = await scanPodcastEpisodes(request.params.id);
        return { data: episodes, count: episodes.length };
      } catch (error: any) {
        return reply.code(404).send({ error: error.message });
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
}
