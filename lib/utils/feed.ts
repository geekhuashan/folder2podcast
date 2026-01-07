import { Podcast } from 'podcast';
import path from 'path';
import type { FeedPodcast, FeedEpisode } from '@/lib/services/feed-data.service';
import { feedConfig } from '@/lib/config';
import { getMimeType } from '@/lib/utils/audio';

/**
 * RSS Feed 生成工具
 * 使用 podcast npm 包生成符合 RSS 2.0 + iTunes 扩展的 Feed
 *
 * 核心功能：
 * - 生成标准的 RSS 2.0 XML
 * - 支持 iTunes 扩展字段
 * - 自动检测音频文件的 MIME 类型
 * - 支持播客封面和剧集封面
 */

/**
 * 生成 RSS 2.0 + iTunes 扩展的 Feed XML
 *
 * @param podcast - 播客信息（包含完整 URL）
 * @param episodesList - 剧集列表（包含完整 URL）
 * @returns RSS Feed XML 字符串
 *
 * @example
 * ```ts
 * const feedData = await generatePodcastFeedData('podcast-uuid');
 * const xml = generateRssFeed(feedData.podcast, feedData.episodes);
 * ```
 *
 * 说明：
 * - podcast 和 episodesList 必须来自 generatePodcastFeedData() 函数
 * - 所有 URL 都是完整的绝对 URL
 * - 剧集按 pubDate 倒序排列（最新的在前面）
 */
export function generateRssFeed(
  podcast: FeedPodcast,
  episodesList: FeedEpisode[]
): string {
  // 获取最新一集的日期作为 Feed 更新时间
  const latestEpisode = episodesList[0];
  const pubDate = latestEpisode?.pubDate || new Date();

  // 创建 Podcast Feed 实例
  const feedOptions: any = {
    title: podcast.title,
    description: podcast.description || '',
    feedUrl: podcast.feedUrl,
    siteUrl: podcast.websiteUrl || podcast.podcastDetailUrl,
    managingEditor: podcast.author || 'Podcast Author',
    webMaster: podcast.author || 'Podcast Author',
    copyright: `Copyright © ${new Date().getFullYear()} ${podcast.author || podcast.title}`,
    language: podcast.language || 'zh-cn',
    categories: [podcast.category || 'Technology'],
    pubDate: pubDate,
    ttl: 60,
    generator: feedConfig.generator,

    // iTunes 扩展字段
    itunesAuthor: podcast.author || 'Podcast Author',
    itunesSubtitle: podcast.description || '',
    itunesSummary: podcast.description || '',
    itunesOwner: {
      name: podcast.author || 'Podcast Author',
      email: podcast.email || 'change-this@example.com',
    },
    itunesExplicit: podcast.explicit || false,
    itunesCategory: [
      {
        text: podcast.category || 'Technology',
      },
    ],
  };

  // 添加播客封面
  if (podcast.imageUrl) {
    feedOptions.imageUrl = podcast.imageUrl;
    feedOptions.itunesImage = podcast.imageUrl;
  }

  const feed = new Podcast(feedOptions);

  // 添加剧集
  for (const ep of episodesList) {
    const episodeTitle = ep.title;
    // 确保 description 有值，如果为空则使用标题
    const episodeDescription = ep.description || episodeTitle;

    // 提取音频文件名（用于检测 MIME 类型）
    const fileName = ep.audioUrl.split('/').pop() || '';
    const mimeType = getMimeType(fileName);

    const itemOptions: any = {
      title: episodeTitle,
      description: episodeDescription,
      url: ep.audioUrl,
      guid: ep.audioUrl, // 使用音频 URL 作为唯一标识
      date: ep.pubDate,
      enclosure: {
        url: ep.audioUrl,
        type: mimeType,
        size: ep.fileSize || 0,
      },

      // iTunes 扩展字段
      itunesAuthor: podcast.author || 'Podcast Author',
      itunesExplicit: podcast.explicit || false,
      itunesSubtitle: episodeTitle,
      itunesSummary: episodeDescription,
    };

    // 只有当 duration 大于 0 时才添加（避免 00:00:00）
    if (ep.duration && ep.duration > 0) {
      itemOptions.itunesDuration = ep.duration;
    }

    // 添加剧集封面（如果有）
    if (ep.imageUrl) {
      itemOptions.itunesImage = ep.imageUrl;
    }

    feed.addItem(itemOptions);
  }

  // 生成 XML
  return feed.buildXml();
}
