/**
 * URL 生成工具（统一管理所有 URL 格式）
 *
 * ## 核心设计原则
 *
 * **统一 URL 生成逻辑**：
 * 所有音频、封面、Feed 的 URL 生成都必须使用这个文件中的函数。
 * 确保前端、后端、RSS Feed 使用完全一致的 URL 格式。
 *
 * ## 统一架构（本地和S3完全一致）
 *
 * **文件存储路径**（物理磁盘或S3）：
 * ```
 * audio/
 *   ├── {userId}/              # 用户隔离目录
 *   │   ├── {podcastName}/     # 播客目录
 *   │   │   ├── audio.mp3      # 音频文件
 *   │   │   ├── cover.jpg      # 播客封面
 *   │   │   └── ep-xxx.jpg     # 剧集封面
 * ```
 *
 * **URL 访问路径**（完全统一）：
 * ```
 * /audio/{userId}/{podcastName}/{fileName}
 * ```
 *
 * **为什么统一？**
 * - 本地模式：文件操作直接更新数据库，不再需要"智能匹配"路由
 * - S3模式：URL必须是完整路径才能直接访问
 * - 架构统一：代码中不再有 if-else 判断存储类型
 *
 * ## 相关文件
 *
 * - 后端 URL 工具：`src/utils/url.ts`（本文件）
 * - 前端 URL 工具：`web/src/utils/url.js`（与本文件保持完全一致）
 * - 音频路由：`src/routes/audio.routes.ts`（处理 URL 到文件系统路径的映射）
 * - RSS 生成：`src/utils/feed.ts`（使用本工具生成 Feed 中的 URL）
 *
 * ## 使用示例
 *
 * ```typescript
 * // 后端生成 RSS Feed
 * const audioUrl = getAudioUrl('admin', '我的播客', 'episode01.mp3');
 * // => http://example.com/audio/admin/我的播客/episode01.mp3
 *
 * // 前端播放音频
 * const audioUrl = getAudioUrl(podcast.userId, podcast.dirName, episode.fileName);
 * // => /audio/admin/我的播客/episode01.mp3
 * ```
 *
 * ## 重要约定
 *
 * ⚠️ **禁止在其他地方手动拼接 URL**
 * - 所有 URL 生成必须使用本文件中的函数
 * - 前端使用 `web/src/utils/url.js` 中的对应函数
 * - 确保 URL 格式的全局一致性
 */

import { getEnvConfig } from './env';
import { getStorage } from '../services/storage';

const { BASE_URL, S3_PUBLIC_URL, S3_BUCKET_PREFIX } = getEnvConfig();

/**
 * 确保 URL 包含协议前缀
 * 如果 URL 不以 http:// 或 https:// 开头，自动添加 http://
 */
function ensureProtocol(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  return url;
}

/**
 * 生成音频文件的公开访问 URL
 *
 * @param userId - 用户ID
 * @param podcastDirName - 播客目录名
 * @param fileName - 音频文件名
 * @returns 完整的音频文件 URL
 *
 * S3 模式: {S3_PUBLIC_URL}/{S3_BUCKET_PREFIX}/audio/{userId}/{podcastDirName}/{fileName}
 * 本地模式: {BASE_URL}/audio/{userId}/{podcastDirName}/{fileName}
 */
export function getAudioUrl(userId: string, podcastDirName: string, fileName: string): string {
  const storage = getStorage();
  const storageType = storage.getStorageType();

  // S3 模式：直接返回 S3 CDN URL（包含 bucket prefix）
  if (storageType === 's3' && S3_PUBLIC_URL) {
    const path = `audio/${userId}/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(fileName)}`;
    const url = S3_BUCKET_PREFIX
      ? `${S3_PUBLIC_URL}/${S3_BUCKET_PREFIX}/${path}`
      : `${S3_PUBLIC_URL}/${path}`;
    return url;
  }

  // 本地模式：返回服务器 URL（确保包含协议）
  const baseUrl = ensureProtocol(BASE_URL);
  return `${baseUrl}/audio/${userId}/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(fileName)}`;
}

/**
 * 生成播客封面的公开访问 URL
 *
 * @param userId - 用户ID
 * @param podcastDirName - 播客目录名
 * @returns 完整的封面 URL
 *
 * S3 模式: {S3_PUBLIC_URL}/{S3_BUCKET_PREFIX}/audio/{userId}/{podcastDirName}/cover.jpg
 * 本地模式: {BASE_URL}/audio/{userId}/{podcastDirName}/cover.jpg
 */
export function getPodcastCoverUrl(userId: string, podcastDirName: string): string {
  const storage = getStorage();
  const storageType = storage.getStorageType();

  // S3 模式：直接返回 S3 CDN URL（包含 bucket prefix）
  if (storageType === 's3' && S3_PUBLIC_URL) {
    const path = `audio/${userId}/${encodeURIComponent(podcastDirName)}/cover.jpg`;
    const url = S3_BUCKET_PREFIX
      ? `${S3_PUBLIC_URL}/${S3_BUCKET_PREFIX}/${path}`
      : `${S3_PUBLIC_URL}/${path}`;
    return url;
  }

  // 本地模式：返回服务器 URL（确保包含协议）
  const baseUrl = ensureProtocol(BASE_URL);
  return `${baseUrl}/audio/${userId}/${encodeURIComponent(podcastDirName)}/cover.jpg`;
}

/**
 * 生成剧集封面的公开访问 URL
 *
 * @param userId - 用户ID
 * @param podcastDirName - 播客目录名
 * @param coverFileName - 封面文件名（例如: ep-xxx.jpg）
 * @returns 完整的封面 URL
 *
 * S3 模式: {S3_PUBLIC_URL}/{S3_BUCKET_PREFIX}/audio/{userId}/{podcastDirName}/{coverFileName}
 * 本地模式: {BASE_URL}/audio/{userId}/{podcastDirName}/{coverFileName}
 */
export function getEpisodeCoverUrl(userId: string, podcastDirName: string, coverFileName: string): string {
  const storage = getStorage();
  const storageType = storage.getStorageType();

  // S3 模式：直接返回 S3 CDN URL（包含 bucket prefix）
  if (storageType === 's3' && S3_PUBLIC_URL) {
    const path = `audio/${userId}/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(coverFileName)}`;
    const url = S3_BUCKET_PREFIX
      ? `${S3_PUBLIC_URL}/${S3_BUCKET_PREFIX}/${path}`
      : `${S3_PUBLIC_URL}/${path}`;
    return url;
  }

  // 本地模式：返回服务器 URL（确保包含协议）
  const baseUrl = ensureProtocol(BASE_URL);
  return `${baseUrl}/audio/${userId}/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(coverFileName)}`;
}

/**
 * 生成 RSS Feed 的公开访问 URL
 *
 * @param podcastId - 播客 ID（格式: userId:dirName）
 * @returns 完整的 Feed URL
 *
 * 格式: {BASE_URL}/feeds/{userId}/{dirName}.xml
 */
export function getFeedUrl(podcastId: string): string {
  // 确保 BASE_URL 包含协议前缀
  let baseUrl = BASE_URL;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`;
  }

  // 将 podcastId 拆分为 userId 和 dirName
  const [userId, ...dirParts] = podcastId.split(':');
  const dirName = dirParts.length > 0 ? dirParts.join(':') : '';

  const encodedUserId = encodeURIComponent(userId || 'default');
  const encodedDirName = encodeURIComponent(dirName || userId);

  return `${baseUrl}/feeds/${encodedUserId}/${encodedDirName}.xml`;
}

/**
 * 生成音频文件的相对路径（用于前端）
 *
 * @param userId - 用户ID
 * @param podcastDirName - 播客目录名
 * @param fileName - 音频文件名
 * @returns 相对路径
 *
 * 格式: /audio/{userId}/{podcastDirName}/{fileName}
 */
export function getAudioRelativePath(userId: string, podcastDirName: string, fileName: string): string {
  return `/audio/${userId}/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(fileName)}`;
}

/**
 * 生成封面文件的相对路径（用于前端）
 *
 * @param userId - 用户ID
 * @param podcastDirName - 播客目录名
 * @param coverFileName - 封面文件名
 * @returns 相对路径
 *
 * 格式: /audio/{userId}/{podcastDirName}/{coverFileName}
 */
export function getCoverRelativePath(userId: string, podcastDirName: string, coverFileName: string): string {
  return `/audio/${userId}/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(coverFileName)}`;
}
