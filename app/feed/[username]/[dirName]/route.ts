import { NextRequest, NextResponse } from 'next/server';
import { generatePodcastFeedDataCached } from '@/lib/services/feed-data.service';
import { generateRssFeed } from '@/lib/utils/feed';
import { feedConfig } from '@/lib/config';
import { getPodcastByUsernameAndDir } from '@/lib/db/queries';

/**
 * RSS Feed 路由
 * 动态生成播客的 RSS Feed
 *
 * 路径：/feed/[username]/[dirName]
 * 方法：GET
 * 认证：❌ 不需要（RSS Feed 是公开的）
 *
 * 说明：
 * - 使用 (username, dirName) 查询播客
 * - 使用缓存机制避免频繁扫描文件系统
 * - 返回符合 RSS 2.0 + iTunes 扩展的 XML
 * - 播客客户端通过这个 URL 订阅播客
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; dirName: string }> }
) {
  try {
    const { username, dirName } = await params;

    // 1. 通过 (username, dirName) 查询播客
    const podcast = await getPodcastByUsernameAndDir(username, dirName);

    if (!podcast) {
      return new NextResponse('Podcast not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // 2. 获取播客和剧集数据（使用内部 podcast.id，带缓存）
    const feedData = await generatePodcastFeedDataCached(podcast.id);

    // 3. 生成 RSS XML
    const xml = generateRssFeed(feedData.podcast, feedData.episodes);

    // 4. 返回 XML 响应
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': `public, max-age=${feedConfig.cacheMaxAge}`,
      },
    });
  } catch (error) {
    console.error('[RSS Feed] Error:', error);

    // 其他错误返回 500
    return new NextResponse('Internal server error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
