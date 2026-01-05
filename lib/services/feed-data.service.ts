import { db } from '@/lib/db';
import { podcasts, episodes as episodesTable, type Podcast, type Episode } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { scanPodcastFiles } from './file-scan.service';
import {
  getAudioUrl,
  getPodcastCoverUrl,
  getEpisodeCoverUrl,
  getRssFeedUrl,
} from '@/lib/utils/url';
import { getUserById } from '@/lib/db/queries';

/**
 * 统一数据源服务
 * 确保 Web 管理页面和 RSS Feed 的数据 100% 一致
 *
 * 核心原则：
 * - 所有数据必须通过这个服务获取
 * - 禁止直接查询数据库后返回数据
 * - 统一生成 URL（音频、封面、RSS Feed）
 * - 提供缓存机制以提高性能
 */

/**
 * 播客 Feed 数据类型（包含完整 URL）
 * 保留 userId 和 dirName 用于前端导航和 API 调用
 */
export interface FeedPodcast extends Podcast {
  // RSS Feed URL
  feedUrl: string;
  // 播客封面 URL
  imageUrl: string;
  // 剧集是否继承播客设置
  inheritanceEnabled: boolean;
}

/**
 * 剧集 Feed 数据类型（包含完整 URL）
 */
export interface FeedEpisode extends Omit<Episode, 'podcastId' | 'fileName' | 'coverFileName'> {
  // 音频文件 URL
  audioUrl: string;
  // 剧集封面 URL（如果没有剧集封面，使用播客封面）
  imageUrl: string;
  // 文件大小（字节）
  fileSize: number;
}

/**
 * Feed 数据结构
 */
export interface PodcastFeedData {
  podcast: FeedPodcast;
  episodes: FeedEpisode[];
}

/**
 * 缓存管理器
 * 使用内存缓存，避免频繁扫描文件系统和查询数据库
 */
const feedCache = new Map<string, { data: PodcastFeedData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 生成播客 Feed 数据（核心函数）
 *
 * @param podcastId - 播客 ID
 * @param skipCache - 是否跳过缓存（默认 false）
 * @returns 播客和剧集数据
 *
 * @example
 * ```ts
 * const feedData = await generatePodcastFeedData('podcast-uuid');
 *
 * // Web 页面使用
 * console.log(feedData.podcast.title);
 * console.log(feedData.episodes[0].audioUrl);
 *
 * // RSS Feed 生成器使用
 * const xml = generateRssFeed(feedData.podcast, feedData.episodes);
 * ```
 *
 * 工作流程：
 * 1. 从数据库获取播客信息
 * 2. 扫描文件系统并同步到数据库
 * 3. 从数据库读取最新剧集数据
 * 4. 生成完整的 URL（音频、封面）
 * 5. 返回标准化的数据结构
 */
export async function generatePodcastFeedData(
  podcastId: string,
  skipCache: boolean = false
): Promise<PodcastFeedData> {
  // 1. 从数据库获取播客信息
  const podcast = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .limit(1)
    .get();

  if (!podcast) {
    throw new Error(`Podcast not found: ${podcastId}`);
  }

  // 2. 从数据库读取最新剧集数据（不需要扫描文件系统）
  const episodeRecords = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.podcastId, podcastId))
    .orderBy(episodesTable.pubDate) // 按发布时间倒序排列
    .all();

  // 3. 获取用户名用于生成 Feed URL
  const user = await getUserById(podcast.userId);
  if (!user) {
    throw new Error(`User not found: ${podcast.userId}`);
  }

  // 4. 生成完整的 URL
  const feedPodcast: FeedPodcast = {
    id: podcast.id,
    userId: podcast.userId,
    dirName: podcast.dirName,
    title: podcast.title,
    description: podcast.description,
    author: podcast.author,
    email: podcast.email,
    websiteUrl: podcast.websiteUrl,
    language: podcast.language,
    category: podcast.category,
    explicit: podcast.explicit,
    inheritanceEnabled: podcast.inheritanceEnabled ?? true,
    createdAt: podcast.createdAt,
    updatedAt: podcast.updatedAt,
    feedUrl: getRssFeedUrl(user.username, podcast.dirName),
    imageUrl: getPodcastCoverUrl(podcast.userId, podcast.dirName),
  };

  const feedEpisodes: FeedEpisode[] = episodeRecords.map(ep => {
    // 应用继承逻辑：如果播客启用了继承，且剧集没有封面，则使用播客封面
    const shouldInheritCover = podcast.inheritanceEnabled && !ep.coverFileName;

    return {
      id: ep.id,
      title: ep.title,
      description: ep.description,
      pubDate: ep.pubDate,
      duration: ep.duration,
      fileSize: ep.fileSize,
      sortOrder: ep.sortOrder,
      version: ep.version,
      createdAt: ep.createdAt,
      updatedAt: ep.updatedAt,
      audioUrl: getAudioUrl(podcast.userId, podcast.dirName, ep.fileName),
      imageUrl: shouldInheritCover
        ? getPodcastCoverUrl(podcast.userId, podcast.dirName)
        : ep.coverFileName
        ? getEpisodeCoverUrl(podcast.userId, podcast.dirName, ep.coverFileName)
        : getPodcastCoverUrl(podcast.userId, podcast.dirName),
    };
  });

  return {
    podcast: feedPodcast,
    episodes: feedEpisodes,
  };
}

/**
 * 生成播客 Feed 数据（带缓存）
 *
 * @param podcastId - 播客 ID
 * @returns 播客和剧集数据
 *
 * 说明：
 * - 优先返回缓存数据（如果未过期）
 * - 缓存过期后重新生成并更新缓存
 * - 适用于 RSS Feed 生成（减少扫描次数）
 */
export async function generatePodcastFeedDataCached(
  podcastId: string
): Promise<PodcastFeedData> {
  const now = Date.now();
  const cached = feedCache.get(podcastId);

  // 如果缓存存在且未过期，直接返回
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`[generatePodcastFeedDataCached] 使用缓存: ${podcastId}`);
    return cached.data;
  }

  // 缓存过期或不存在，重新生成
  console.log(`[generatePodcastFeedDataCached] 重新生成: ${podcastId}`);
  const data = await generatePodcastFeedData(podcastId);

  // 更新缓存
  feedCache.set(podcastId, { data, timestamp: now });

  return data;
}

/**
 * 清除播客的缓存
 *
 * @param podcastId - 播客 ID
 *
 * 说明：
 * - 在上传新文件、删除文件、更新元数据后调用
 * - 确保下次获取数据时重新扫描文件系统
 */
export function clearFeedCache(podcastId: string): void {
  feedCache.delete(podcastId);
  console.log(`[clearFeedCache] 清除缓存: ${podcastId}`);
}

/**
 * 清除所有缓存
 *
 * 说明：
 * - 用于开发调试或管理员操作
 */
export function clearAllFeedCache(): void {
  feedCache.clear();
  console.log('[clearAllFeedCache] 清除所有缓存');
}
