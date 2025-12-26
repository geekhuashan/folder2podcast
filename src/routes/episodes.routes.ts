/**
 * 剧集路由（重构后 - 使用统一数据源）
 *
 * 说明：
 * - ✅ 使用统一的数据生成服务（generatePodcastFeedData）
 * - ✅ 确保与 RSS Feed 的数据完全一致
 * - 所有操作需要登录（requireAuth 中间件）
 * - 支持权限检查
 */

import { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.middleware";
import { getCurrentUser } from "../utils/auth";
import {
  updateEpisodeMetadata,
  deleteEpisodeMetadata,
} from "../services/episode";
import { generatePodcastFeedData } from "../services/feed-data.service";
import { scanPodcastEpisodes } from "../services/podcast";
import { getEpisodeCoverUrl } from "../utils/url";
import path from "path";
import fs from "fs-extra";
import { getEnvConfig } from "../utils/env";
import { db } from "../db";
import { episodes as episodesTable, podcasts } from "../db/schema";
import { eq } from "drizzle-orm";

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
   * - 不需要登录（访客模式可访问）
   * - ✅ 调用统一数据源，确保与 RSS Feed 一致
   * - 返回包含自定义元数据的剧集列表
   */
  server.get<{ Params: { id: string } }>(
    "/api/podcasts/:id/episodes",
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
        console.error("[剧集路由] 获取剧集列表失败:", error);
        return reply
          .code(500)
          .send({ error: error.message || "获取剧集列表失败" });
      }
    },
  );

  /**
   * 更新剧集元数据
   * PATCH /api/podcasts/:id/episodes/:fileName
   *
   * 说明：
   * - 需要登录
   * - 只能更新自己播客的剧集
   * - 支持更新 title, description, pubDate, coverUrl, sortOrder
   * - sortOrder 变更后，pubDate 会在下次 Feed 生成时自动重新计算
   */
  server.patch<{
    Params: { id: string; fileName: string };
    Body: {
      title?: string;
      description?: string;
      pubDate?: string;
      coverUrl?: string;
      sortOrder?: number;
    };
  }>(
    "/api/podcasts/:id/episodes/:fileName",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      // 解码文件名
      const decodedFileName = decodeURIComponent(fileName);

      try {
        const updated = await updateEpisodeMetadata(
          id,
          decodedFileName,
          user.id,
          request.body,
        );
        return { data: updated };
      } catch (error: any) {
        return reply.code(403).send({ error: error.message });
      }
    },
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
    "/api/podcasts/:id/episodes/:fileName",
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
    },
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
    "/api/podcasts/:id/episodes/:fileName/cover",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      try {
        // 解码文件名
        const decodedFileName = decodeURIComponent(fileName);

        // 解析 podcastId
        const [userId, dirName] = id.split(":");
        if (userId !== user.id) {
          return reply.code(403).send({ error: "无权限操作此播客" });
        }

        // 获取上传的文件
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: "未找到上传的文件" });
        }

        // 验证文件类型
        const allowedMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          return reply
            .code(400)
            .send({ error: "不支持的图片格式，仅支持 JPG、PNG、GIF、WebP" });
        }

        // 生成封面文件名: {音频文件名（不含扩展名）}.{图片扩展名}
        const audioBaseName = path.basename(
          decodedFileName,
          path.extname(decodedFileName),
        );
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
          coverUrl: getEpisodeCoverUrl(dirName, coverFileName),
        };
      } catch (error: any) {
        console.error("上传剧集封面失败:", error);
        return reply.code(500).send({ error: error.message });
      }
    },
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
    "/api/podcasts/:id/episodes/:fileName/cover",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      try {
        // 解码文件名
        const decodedFileName = decodeURIComponent(fileName);

        // 解析 podcastId
        const [userId, dirName] = id.split(":");
        if (userId !== user.id) {
          return reply.code(403).send({ error: "无权限操作此播客" });
        }

        // 查询剧集信息
        const episodeId = `${id}:${decodedFileName}`;
        const episode = await db
          .select()
          .from(episodesTable)
          .where(eq(episodesTable.id, episodeId))
          .get();

        if (!episode || !episode.coverUrl) {
          return reply.code(404).send({ error: "剧集封面不存在" });
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
        console.error("删除剧集封面失败:", error);
        return reply.code(500).send({ error: error.message });
      }
    },
  );

  /**
   * 重新发布剧集
   * POST /api/podcasts/:id/episodes/:fileName/republish
   *
   * 功能：
   * - 将剧集的 version 字段 +1
   * - 更新 pubDate 为当前时间
   * - 这会改变 RSS Feed 中的 GUID,客户端将其识别为"新剧集"
   *
   * 使用场景：
   * - 让已收听过的用户重新看到"未收听"标记
   * - 将旧内容推送到播客订阅的最前面
   */
  server.post<{ Params: { id: string; fileName: string } }>(
    "/api/podcasts/:id/episodes/:fileName/republish",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getCurrentUser(request);
      const { id, fileName } = request.params;

      try {
        // 解码文件名
        const decodedFileName = decodeURIComponent(fileName);

        // 解析 podcastId
        const [userId, dirName] = id.split(":");
        if (userId !== user.id) {
          return reply.code(403).send({ error: "无权限操作此播客" });
        }

        // 查询剧集信息
        const episodeId = `${id}:${decodedFileName}`;
        const episode = await db
          .select()
          .from(episodesTable)
          .where(eq(episodesTable.id, episodeId))
          .get();

        if (!episode) {
          return reply.code(404).send({ error: "剧集不存在" });
        }

        // ⭐ 重新发布：version++ 并更新 pubDate
        const newVersion = (episode.version || 1) + 1;
        const updated = await db
          .update(episodesTable)
          .set({
            version: newVersion,
            pubDate: new Date(), // 设置为当前时间
            updatedAt: new Date(),
          })
          .where(eq(episodesTable.id, episodeId))
          .returning()
          .get();

        console.log(
          `[重新发布] ${decodedFileName}: version ${episode.version || 1} → ${newVersion}`,
        );

        return {
          success: true,
          data: {
            version: newVersion,
            pubDate: updated.pubDate,
            message: `剧集已重新发布为 v${newVersion}，将在播客客户端中显示为新剧集`,
          },
        };
      } catch (error: any) {
        console.error("重新发布剧集失败:", error);
        return reply.code(500).send({ error: error.message });
      }
    },
  );

  /**
   * 预览批量重新排序的结果
   * POST /api/podcasts/:id/episodes/reorder/preview
   *
   * 功能：模拟使用新策略重新排序的结果，不实际修改数据库
   * - 返回每个剧集的旧序号和新序号对比
   */
  server.post<{
    Params: { id: string };
    Body: { strategy: string };
  }>(
    "/api/podcasts/:id/episodes/reorder/preview",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const podcastId = request.params.id;
        const { strategy } = request.body;
        const user = getCurrentUser(request);

        // 验证策略参数
        const validStrategies = ["prefix", "suffix", "first", "last", "date"];
        if (!strategy || !validStrategies.includes(strategy)) {
          return reply.code(400).send({
            error: `无效的排序策略。支持的策略: ${validStrategies.join(", ")}`,
          });
        }

        // 验证播客存在并检查权限
        const podcast = await db
          .select()
          .from(podcasts)
          .where(eq(podcasts.id, podcastId))
          .get();
        if (!podcast) {
          return reply.code(404).send({ error: "播客不存在" });
        }
        if (podcast.userId !== user.id) {
          return reply.code(403).send({ error: "无权限操作此播客" });
        }

        // 获取当前剧集列表（旧的 sortOrder）
        const currentEpisodes = await db
          .select()
          .from(episodesTable)
          .where(eq(episodesTable.podcastId, podcastId))
          .all();

        // 模拟使用新策略重新解析文件名序号
        const { parseEpisodeNumber } = await import("../utils/episode");

        const previewEpisodes = currentEpisodes.map((ep) => {
          const newNumber = parseEpisodeNumber(ep.fileName, {
            episodeNumberStrategy: strategy as any, // ⚠️ 策略已在上面验证过有效性
          });
          return {
            fileName: ep.fileName,
            title: ep.title || ep.fileName,
            oldSortOrder: ep.sortOrder,
            newSortOrder: newNumber,
            changed: ep.sortOrder !== newNumber,
          };
        });

        // 统计变化数量
        const changedCount = previewEpisodes.filter((ep) => ep.changed).length;

        return {
          success: true,
          data: {
            strategy,
            total: previewEpisodes.length,
            changed: changedCount,
            episodes: previewEpisodes.sort(
              (a, b) => (a.newSortOrder || 9999) - (b.newSortOrder || 9999),
            ),
            message: `使用 "${strategy}" 策略将影响 ${changedCount} 个剧集的排序`,
          },
        };
      } catch (error: any) {
        console.error("预览重新排序失败:", error);
        return reply.code(500).send({ error: error.message });
      }
    },
  );

  /**
   * 批量重新排序剧集
   * POST /api/podcasts/:id/episodes/reorder
   *
   * 功能：根据新的文件名解析策略重新计算所有剧集的 sortOrder
   * - 支持 prefix/suffix/first/last/date 等策略
   * - sortOrder 更新后，pubDate 会在下次访问时自动重新计算
   */
  server.post<{
    Params: { id: string };
    Body: { strategy: string };
  }>(
    "/api/podcasts/:id/episodes/reorder",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const podcastId = request.params.id;
        const { strategy } = request.body;
        const user = getCurrentUser(request);

        // 验证策略参数
        const validStrategies = ["prefix", "suffix", "first", "last", "date"];
        if (!strategy || !validStrategies.includes(strategy)) {
          return reply.code(400).send({
            error: `无效的排序策略。支持的策略: ${validStrategies.join(", ")}`,
          });
        }

        // 验证播客存在并检查权限
        const podcast = await db
          .select()
          .from(podcasts)
          .where(eq(podcasts.id, podcastId))
          .get();
        if (!podcast) {
          return reply.code(404).send({ error: "播客不存在" });
        }
        if (podcast.userId !== user.id) {
          return reply.code(403).send({ error: "无权限操作此播客" });
        }

        console.log(`[批量重新排序] 播客: ${podcastId}, 策略: ${strategy}`);

        // 临时更新播客配置的排序策略
        await db
          .update(podcasts)
          .set({
            episodeNumberStrategy: strategy,
            updatedAt: new Date(),
          })
          .where(eq(podcasts.id, podcastId));

        // 重新扫描播客，这会自动：
        // 1. 使用新策略重新提取文件名序号
        // 2. 更新所有剧集的 sortOrder
        // 3. pubDate 会在下次访问时通过 generatePubDatesForEpisodes() 自动重新计算
        await scanPodcastEpisodes(podcastId);

        // 查询更新后的剧集列表
        const updatedEpisodes = await db
          .select()
          .from(episodesTable)
          .where(eq(episodesTable.podcastId, podcastId))
          .all();

        console.log(`[批量重新排序] 成功更新 ${updatedEpisodes.length} 个剧集`);

        return {
          success: true,
          data: {
            updated: updatedEpisodes.length,
            strategy,
            message: `已使用 "${strategy}" 策略重新计算 ${updatedEpisodes.length} 个剧集的排序`,
          },
        };
      } catch (error: any) {
        console.error("批量重新排序失败:", error);
        return reply.code(500).send({ error: error.message });
      }
    },
  );
}
