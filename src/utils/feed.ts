/**
 * RSS Feed 生成工具（函数式）
 *
 * 说明：
 * - 使用 podcast npm 包生成 RSS 2.0 + iTunes 扩展
 * - 纯函数，无副作用
 */

import { Podcast } from 'podcast';
import { podcasts, episodes } from '../db/schema';
import { getEnvConfig } from './env';

const { BASE_URL } = getEnvConfig();

/**
 * 生成 RSS 2.0 + iTunes 扩展的 Feed
 *
 * @param podcast - 播客配置（从数据库读取）
 * @param episodesList - 剧集列表（从数据库读取）
 * @returns RSS XML 字符串
 *
 * 说明：
 * - 自动处理播客封面和剧集封面的 URL
 * - 支持 iTunes 播客扩展标签
 * - 剧集按数据库中的顺序排列（已在服务层排序）
 */
export function generateRssFeed(
  podcast: typeof podcasts.$inferSelect,
  episodesList: Array<typeof episodes.$inferSelect>
): string {
  // 播客封面 URL（如果存在）
  const podcastImageUrl = `${BASE_URL}/audio/${podcast.userId}/${podcast.dirName}/cover.jpg`;

  // 获取最新一集的日期作为 Feed 更新时间
  const latestEpisode = episodesList[episodesList.length - 1];
  const pubDate = latestEpisode?.pubDate ? new Date(latestEpisode.pubDate) : new Date();

  // Feed URL
  const feedUrl = `${BASE_URL}/feeds/${encodeURIComponent(podcast.id)}.xml`;

  // 创建 Podcast 实例
  const feed = new Podcast({
    title: podcast.title,
    description: podcast.description || '',
    feedUrl: feedUrl,
    siteUrl: podcast.websiteUrl || BASE_URL,
    imageUrl: podcastImageUrl,
    author: podcast.author || '',
    managingEditor: podcast.author || '',
    webMaster: podcast.author || '',
    copyright: `Copyright © ${new Date().getFullYear()} ${podcast.author || podcast.title}`,
    language: podcast.language || 'zh-cn',
    categories: [podcast.category || 'Technology'],
    pubDate: pubDate,
    ttl: 60,
    itunesAuthor: podcast.author || '',
    itunesSubtitle: podcast.description || '',
    itunesSummary: podcast.description || '',
    itunesOwner: {
      name: podcast.author || '',
      email: podcast.email || '',
    },
    itunesExplicit: podcast.explicit || false,
    itunesCategory: [
      {
        text: podcast.category || 'Technology',
      },
    ],
    itunesImage: podcastImageUrl,
  });

  // 添加剧集
  episodesList.forEach((ep) => {
    // 音频文件 URL
    const audioUrl = `${BASE_URL}/audio/${podcast.userId}/${podcast.dirName}/${encodeURIComponent(ep.fileName)}`;

    // 剧集封面 URL（如果存在）
    const episodeImageUrl = ep.coverUrl
      ? `${BASE_URL}/audio/${podcast.userId}/${podcast.dirName}/${encodeURIComponent(ep.coverUrl)}`
      : podcastImageUrl;

    // 剧集标题（优先使用自定义标题）
    const episodeTitle = ep.title || ep.fileName;

    // 剧集描述
    const episodeDescription = ep.description || '';

    // 发布时间
    const episodePubDate = ep.pubDate ? new Date(ep.pubDate) : new Date();

    feed.addItem({
      title: episodeTitle,
      description: episodeDescription,
      url: audioUrl,
      guid: audioUrl, // 使用音频 URL 作为唯一标识
      date: episodePubDate,
      enclosure: {
        url: audioUrl,
        type: 'audio/mpeg',
        size: ep.fileSize || 0,
      },
      itunesAuthor: podcast.author || '',
      itunesExplicit: podcast.explicit || false,
      itunesSubtitle: episodeTitle,
      itunesSummary: episodeDescription,
      itunesDuration: ep.duration || 0,
      itunesImage: episodeImageUrl,
    });
  });

  // 生成 XML
  return feed.buildXml();
}
