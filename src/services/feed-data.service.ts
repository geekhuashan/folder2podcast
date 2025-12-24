/**
 * 统一的播客数据生成服务
 *
 * ⚠️ 重要：这是唯一的数据源
 * - Web 管理页面 API 必须调用此服务
 * - RSS Feed 生成必须调用此服务
 * - 确保所有地方看到的数据 100% 一致
 *
 * 工作流程：
 * 1. 扫描文件系统并同步到数据库（scanPodcastEpisodes）
 * 2. 从数据库读取最新数据
 * 3. 检测并填充封面 URL
 * 4. 返回标准化的数据结构
 */

import { db } from '../db';
import { podcasts, episodes as episodesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { scanPodcastEpisodes } from './podcast';
import { getAudioUrl, getEpisodeCoverUrl, getPodcastCoverUrl } from '../utils/url';
import { detectPodcastCover } from '../utils/file.utils';
import { getEnvConfig } from '../utils/env';
import { getBasePubDate, generatePubDatesForEpisodes } from '../utils/sortOrder';
import path from 'path';

const { AUDIO_DIR } = getEnvConfig();

/**
 * 剧集数据（标准化格式）
 */
export interface FeedEpisode {
  id: string;
  podcastId: string;
  fileName: string;
  title: string;  // 确保有默认值，不会为 null
  description: string | null;
  pubDate: Date;
  coverUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  fileSize: number;
  audioUrl: string;
  version: number;  // ⭐ 版本号（用于重新发布功能）
  sortOrder: number;  // ⭐ 排序序号（用于控制剧集顺序）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 播客数据（标准化格式）
 */
export interface FeedPodcast {
  id: string;
  userId: string;
  dirName: string;
  title: string;
  description: string;
  author: string;
  email: string;
  websiteUrl: string;
  language: string;  // 确保有默认值
  category: string;  // 确保有默认值
  explicit: boolean;
  coverFileName: string | null;
  imageUrl: string | null;
  titleFormat: string;
  episodeNumberStrategy: string;
  useMtime: boolean;
  basePubDate: Date | null;  // ⭐ 基准发布日期（用于 pubDate 计算）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 统一数据源的返回结果
 */
export interface PodcastFeedData {
  podcast: FeedPodcast;
  episodes: FeedEpisode[];
}

/**
 * 生成播客的完整数据（唯一数据源）
 *
 * @param podcastId - 播客 ID（格式：userId:dirName）
 * @returns 包含播客信息和剧集列表的标准化数据
 *
 * 说明：
 * - 这是唯一的数据生成函数
 * - 所有需要播客数据的地方都必须调用此函数
 * - 确保 Web API 和 RSS Feed 的数据完全一致
 */
export async function generatePodcastFeedData(podcastId: string): Promise<PodcastFeedData> {
  // 1. 扫描文件系统并同步到数据库
  //    这一步确保：
  //    - 新上传的文件被检测到
  //    - episodes.json 的更新被读取
  //    - 封面文件被自动检测
  //    - 数据库中的剧集信息是最新的
  await scanPodcastEpisodes(podcastId);

  // 2. 从数据库读取播客信息
  const podcast = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .get();

  if (!podcast) {
    throw new Error(`播客不存在: ${podcastId}`);
  }

  // 3. 从数据库读取剧集列表
  const rawEpisodes = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.podcastId, podcastId))
    .all();

  // ⭐ 4. 根据 sortOrder 自动生成 pubDate
  const baseDate = getBasePubDate(
    { basePubDate: podcast.basePubDate ? new Date(podcast.basePubDate) : null },
    rawEpisodes.map(ep => ({
      sortOrder: ep.sortOrder,
      createdAt: ep.createdAt ? new Date(ep.createdAt) : new Date(),
    }))
  );

  const episodesWithPubDate = generatePubDatesForEpisodes(
    rawEpisodes.map(ep => ({
      ...ep,
      pubDate: ep.pubDate ? new Date(ep.pubDate) : null,
    })),
    baseDate
  );

  // 5. 检测播客封面
  const [userId, dirName] = podcastId.split(':');
  const podcastCoverFileName = await detectPodcastCover(dirName, path.join(AUDIO_DIR, userId, dirName));
  const podcastImageUrl = podcastCoverFileName
    ? getPodcastCoverUrl(dirName)
    : null;

  // 6. 转换为标准化格式，填充完整的 URL
  const episodes: FeedEpisode[] = episodesWithPubDate.map((ep) => {
    // 音频 URL
    const audioUrl = getAudioUrl(dirName, ep.fileName);

    // 剧集封面 URL：优先使用剧集自己的封面，否则 fallback 到播客封面
    const imageUrl = ep.coverUrl
      ? getEpisodeCoverUrl(dirName, ep.coverUrl)
      : podcastImageUrl;

    return {
      id: ep.id,
      podcastId: ep.podcastId,
      fileName: ep.fileName,
      title: ep.title || ep.fileName,  // 确保不为 null
      description: ep.description,
      pubDate: ep.pubDate || new Date(),  // ⭐ 使用自动生成的 pubDate
      coverUrl: ep.coverUrl,
      imageUrl,
      duration: ep.duration,
      fileSize: ep.fileSize || 0,  // 确保不为 null
      audioUrl,
      version: ep.version || 1,
      sortOrder: ep.sortOrder || 0,  // ⭐ 新增 sortOrder
      createdAt: ep.createdAt ? new Date(ep.createdAt) : new Date(),
      updatedAt: ep.updatedAt ? new Date(ep.updatedAt) : new Date(),
    };
  });

  // ⭐ 7. 按 pubDate 降序排列（newest first）
  // 符合播客客户端标准行为
  episodes.sort((a, b) => {
    const aTime = a.pubDate.getTime();
    const bTime = b.pubDate.getTime();
    return bTime - aTime;  // 降序：最新的在前
  });

  // 7. 转换播客为标准化格式
  const feedPodcast: FeedPodcast = {
    id: podcast.id,
    userId: podcast.userId,
    dirName: podcast.dirName,
    title: podcast.title,
    description: podcast.description || '',
    author: podcast.author || '',
    email: podcast.email || '',
    websiteUrl: podcast.websiteUrl || '',
    language: podcast.language || 'zh-cn',
    category: podcast.category || 'Technology',
    explicit: !!podcast.explicit,
    coverFileName: podcastCoverFileName,
    imageUrl: podcastImageUrl,
    titleFormat: podcast.titleFormat || 'clean',
    episodeNumberStrategy: podcast.episodeNumberStrategy || 'prefix',
    useMtime: !!podcast.useMTime,  // 注意大小写：useMTime
    basePubDate: podcast.basePubDate ? new Date(podcast.basePubDate) : null,  // ⭐ 基准日期
    createdAt: podcast.createdAt ? new Date(podcast.createdAt) : new Date(),  // 处理 null
    updatedAt: podcast.updatedAt ? new Date(podcast.updatedAt) : new Date(),  // 处理 null
  };

  return {
    podcast: feedPodcast,
    episodes,
  };
}
