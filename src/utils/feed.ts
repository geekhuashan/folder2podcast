/**
 * RSS Feed 生成工具（重构后 - 使用统一数据格式）
 *
 * 说明：
 * - 使用 podcast npm 包生成 RSS 2.0 + iTunes 扩展
 * - ✅ 接收统一数据格式（FeedPodcast 和 FeedEpisode）
 * - ✅ 自动检测 MIME type
 * - ✅ 使用完整的 URL（不再手动生成）
 */

import { Podcast } from 'podcast';
import path from 'path';
import { getEnvConfig } from './env';
import { FeedPodcast, FeedEpisode } from '../services/feed-data.service';
import { getFeedUrl } from './url';

const { BASE_URL } = getEnvConfig();

/**
 * 根据文件扩展名获取 MIME type
 *
 * @param fileName - 文件名
 * @returns MIME type 字符串
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/x-m4a',
    '.aac': 'audio/aac',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

/**
 * 生成 RSS 2.0 + iTunes 扩展的 Feed
 *
 * @param podcast - 播客配置（标准化格式）
 * @param episodesList - 剧集列表（标准化格式）
 * @returns RSS XML 字符串
 *
 * 说明：
 * - ✅ 使用统一数据源的标准化格式
 * - ✅ 所有 URL 已在数据生成阶段完成
 * - ✅ MIME type 自动检测
 * - 剧集按数据库中的顺序排列（已在服务层排序）
 */
export function generateRssFeed(
  podcast: FeedPodcast,
  episodesList: FeedEpisode[]
): string {
  // 获取最新一集的日期作为 Feed 更新时间
  const latestEpisode = episodesList[episodesList.length - 1];
  const pubDate = latestEpisode?.pubDate || new Date();

  // Feed URL
  const feedUrl = getFeedUrl(podcast.id);

  // 创建 Podcast 实例
  const feedOptions: any = {
    title: podcast.title,
    description: podcast.description,
    feedUrl: feedUrl,
    siteUrl: podcast.websiteUrl || BASE_URL,
    author: podcast.author,
    managingEditor: podcast.author,
    webMaster: podcast.author,
    copyright: `Copyright © ${new Date().getFullYear()} ${podcast.author || podcast.title}`,
    language: podcast.language,
    categories: [podcast.category],
    pubDate: pubDate,
    ttl: 60,
    itunesAuthor: podcast.author,
    itunesSubtitle: podcast.description,
    itunesSummary: podcast.description,
    itunesOwner: {
      name: podcast.author,
      email: podcast.email,
    },
    itunesExplicit: podcast.explicit,
    itunesCategory: [
      {
        text: podcast.category,
      },
    ],
  };

  // ✅ 只有当播客封面存在时才添加 imageUrl
  if (podcast.imageUrl) {
    feedOptions.imageUrl = podcast.imageUrl;
    feedOptions.itunesImage = podcast.imageUrl;
  }

  const feed = new Podcast(feedOptions);

  // 添加剧集
  episodesList.forEach((ep) => {
    // ✅ 使用已生成好的完整 URL
    const audioUrl = ep.audioUrl;
    const episodeImageUrl = ep.imageUrl || podcast.imageUrl;  // fallback 到播客封面

    // 剧集标题
    const episodeTitle = ep.title || ep.fileName;

    // 剧集描述
    const episodeDescription = ep.description || '';

    // ✅ 自动检测 MIME type
    const mimeType = getMimeType(ep.fileName);

    const itemOptions: any = {
      title: episodeTitle,
      description: episodeDescription,
      url: audioUrl,
      guid: audioUrl, // 使用音频 URL 作为唯一标识
      date: ep.pubDate,
      enclosure: {
        url: audioUrl,
        type: mimeType,  // ✅ 动态检测
        size: ep.fileSize || 0,
      },
      itunesAuthor: podcast.author,
      itunesExplicit: podcast.explicit,
      itunesSubtitle: episodeTitle,
      itunesSummary: episodeDescription,
      itunesDuration: ep.duration || 0,
    };

    // ✅ 只有当剧集封面存在时才添加 itunesImage
    if (episodeImageUrl) {
      itemOptions.itunesImage = episodeImageUrl;
    }

    feed.addItem(itemOptions);
  });

  // 生成 XML
  return feed.buildXml();
}

