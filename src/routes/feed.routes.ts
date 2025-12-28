/**
 * Feed 路由（重构后 - 使用统一数据源）
 *
 * 说明：
 * - ✅ 使用统一的数据生成服务（generatePodcastFeedData）
 * - ✅ 确保与 Web 管理页面的数据完全一致
 * - 公开访问（不需要登录）
 * - 生成 RSS 2.0 + iTunes 扩展的 XML
 */

import { FastifyInstance } from 'fastify';
import { generateRssFeed } from '../utils/feed';
import { generatePodcastFeedData } from '../services/feed-data.service';

/**
 * 注册 Feed 路由
 */
export async function registerFeedRoutes(server: FastifyInstance) {
  /**
   * 生成 RSS Feed
   * GET /feeds/:userId/:podcastName.xml
   *
   * 说明：
   * - 公开访问，不需要登录
   * - id 格式: userId:dirName
   * - ✅ 调用统一数据源，确保与 Web API 一致
   */
  server.get<{ Params: { userId: string; podcastName: string } }>(
    '/feeds/:userId/:podcastName.xml',
    async (request, reply) => {
      const userId = decodeURIComponent(request.params.userId);
      const podcastName = decodeURIComponent(request.params.podcastName);
      const podcastId = `${userId}:${podcastName}`;

      try {
        // ✅ 调用统一数据生成服务
        //    这一步会：
        //    1. 扫描文件系统
        //    2. 同步数据库
        //    3. 检测封面
        //    4. 返回标准化数据
        const feedData = await generatePodcastFeedData(podcastId);

        // 生成 RSS XML
        const xml = generateRssFeed(feedData.podcast, feedData.episodes);

        // 设置响应头
        reply.type('application/xml; charset=utf-8');
        reply.send(xml);
      } catch (error: any) {
        if (error.message?.includes('播客不存在')) {
          return reply.code(404).send({ error: '播客不存在' });
        }
        throw error;
      }
    }
  );
}

