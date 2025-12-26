/**
 * 播客路由（重构后）
 *
 * 说明：
 * - 删除所有 V1/V2 双版本代码
 * - 统一使用 RESTful API 设计
 * - 所有写操作需要登录（requireAuth 中间件）
 * - 支持多用户隔离
 */

import { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.middleware";
import { getCurrentUser } from "../utils/auth";
import {
  getUserPodcasts,
  getAllPodcasts,
  getPodcastById,
  createPodcast,
  updatePodcast,
  deletePodcast,
  scanPodcastEpisodes,
} from "../services/podcast";

/**
 * 注册播客路由
 */
export async function registerPodcastsRoutes(server: FastifyInstance) {
  /**
   * 获取播客列表
   * GET /api/podcasts
   *
   * 说明：
   * - 不需要登录（访客模式可访问）
   * - 如果已登录，返回当前用户的播客
   * - 如果未登录（访客模式），返回所有播客的只读列表
   */
  server.get("/api/podcasts", async (request, reply) => {
    const user = getCurrentUser(request);

    // 如果未登录（访客模式），返回所有播客（只读）
    if (!user) {
      const list = await getAllPodcasts();

      return {
        data: list.map((podcast) => ({
          id: podcast.id,
          dirName: podcast.dirName,
          title: podcast.title,
          description: podcast.description,
          author: podcast.author,
          language: podcast.language,
          category: podcast.category,
          episodeCount: podcast.episodeCount,
          feedUrl: `/feeds/${encodeURIComponent(podcast.id)}.xml`,
          createdAt: podcast.createdAt,
        })),
        count: list.length,
      };
    }

    // 已登录用户，返回其播客列表
    const list = await getUserPodcasts(user.id);

    return {
      data: list.map((podcast) => ({
        id: podcast.id,
        dirName: podcast.dirName,
        title: podcast.title,
        description: podcast.description,
        author: podcast.author,
        language: podcast.language,
        category: podcast.category,
        episodeCount: podcast.episodeCount,
        feedUrl: `/feeds/${encodeURIComponent(podcast.id)}.xml`,
        createdAt: podcast.createdAt,
      })),
      count: list.length,
    };
  });

  /**
   * 获取播客详情
   * GET /api/podcasts/:id
   *
   * 说明：
   * - 不需要登录（访客模式可访问）
   * - 返回播客的详细信息
   */
  server.get<{ Params: { id: string } }>(
    "/api/podcasts/:id",
    async (request, reply) => {
      const podcast = await getPodcastById(request.params.id);

      if (!podcast) {
        return reply.code(404).send({ error: "播客不存在" });
      }

      return { data: podcast };
    },
  );

  /**
   * 创建播客
   * POST /api/podcasts
   *
   * 说明：
   * - 需要登录
   * - 自动关联到当前用户
   * - 创建文件系统目录
   */
  server.post<{
    Body: {
      dirName: string;
      title: string;
      description?: string;
      author?: string;
    };
  }>("/api/podcasts", { preHandler: requireAuth }, async (request, reply) => {
    const user = getCurrentUser(request);
    const { dirName, title, description, author } = request.body;

    // 参数验证
    if (!dirName || !title) {
      return reply.code(400).send({ error: "dirName 和 title 不能为空" });
    }

    // 创建播客
    const podcast = await createPodcast(user.id, {
      dirName,
      title,
      description,
      author,
    });

    return { data: podcast };
  });

  /**
   * 更新播客配置
   * PATCH /api/podcasts/:id
   *
   * 说明：
   * - 需要登录
   * - 只能更新自己的播客
   * - 支持部分更新
   */
  server.patch<{ Params: { id: string }; Body: any }>(
    "/api/podcasts/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);

      try {
        const updated = await updatePodcast(
          request.params.id,
          user.id,
          request.body as any,
        );
        return { data: updated };
      } catch (error: any) {
        return reply.code(403).send({ error: error.message });
      }
    },
  );

  /**
   * 删除播客
   * DELETE /api/podcasts/:id
   *
   * 说明：
   * - 需要登录
   * - 只能删除自己的播客
   * - 查询参数 deleteFiles (可选):
   *   - true: 同时删除数据库记录和文件系统文件 (推荐)
   *   - false: 只删除数据库记录,保留文件系统文件
   */
  server.delete<{
    Params: { id: string };
    Querystring: { deleteFiles?: string };
  }>(
    "/api/podcasts/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const deleteFiles = request.query.deleteFiles === "true";

      try {
        await deletePodcast(request.params.id, user.id, deleteFiles);
        return { success: true };
      } catch (error: any) {
        return reply.code(403).send({ error: error.message });
      }
    },
  );

  /**
   * 扫描播客目录，同步剧集到数据库
   * POST /api/podcasts/:id/scan
   *
   * 说明：
   * - 需要登录
   * - 从文件系统扫描音频文件
   * - 更新数据库中的剧集记录
   */
  server.post<{ Params: { id: string } }>(
    "/api/podcasts/:id/scan",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const episodes = await scanPodcastEpisodes(request.params.id);
        return { data: episodes, count: episodes.length };
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  );
}
