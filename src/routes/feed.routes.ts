/**
 * Feed 路由（重构后）
 *
 * 说明：
 * - 从数据库读取播客和剧集信息
 * - 公开访问（不需要登录）
 * - 生成 RSS 2.0 + iTunes 扩展的 XML
 */

import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { podcasts, episodes } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateRssFeed } from '../utils/feed';

/**
 * 注册 Feed 路由
 */
export async function registerFeedRoutes(server: FastifyInstance) {
  /**
   * 生成 RSS Feed
   * GET /feeds/:id.xml
   *
   * 说明：
   * - 公开访问，不需要登录
   * - id 格式: userId:dirName
   * - 从数据库读取播客配置和剧集列表
   */
  server.get<{ Params: { id: string } }>('/feeds/:id.xml', async (request, reply) => {
    const podcastId = decodeURIComponent(request.params.id);

    // 从数据库读取播客配置
    const podcast = await db.select().from(podcasts).where(eq(podcasts.id, podcastId)).get();
    if (!podcast) {
      return reply.code(404).send({ error: '播客不存在' });
    }

    // 从数据库读取剧集列表
    const episodesList = await db.select().from(episodes).where(eq(episodes.podcastId, podcastId)).all();

    // 生成 RSS XML
    const xml = generateRssFeed(podcast, episodesList);

    // 设置响应头
    reply.type('application/xml; charset=utf-8');
    reply.send(xml);
  });
}

