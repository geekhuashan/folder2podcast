import { serverConfig, storageConfig } from '@/lib/config';

/**
 * URL 生成工具
 * 统一管理所有 URL 的生成逻辑，确保 Web 页面和 RSS Feed 中的 URL 一致
 *
 * 重要：所有 URL 生成函数都必须使用这个工具，禁止手动拼接 URL
 */

/**
 * 获取服务器基础 URL
 * 从环境变量读取 BASE_URL 和 PORT，拼接成完整的 URL
 */
function getBaseUrl(): string {
  const baseUrl = serverConfig.baseUrl.replace(/\/$/, ''); // 移除末尾的斜杠
  const port = serverConfig.port;

  return `${baseUrl}:${port}`;
}

/**
 * 生成音频文件的完整 URL（通过 API 访问）
 *
 * @param userId - 用户 ID
 * @param podcastDir - 播客目录名
 * @param fileName - 音频文件名
 * @returns 音频文件的完整 URL
 *
 * @example
 * ```ts
 * getAudioUrl('user123', 'my-podcast', 'episode01.mp3')
 * // => 'http://localhost:3000/api/audio/user123/my-podcast/episode01.mp3'
 *
 * getAudioUrl('user123', 'my-podcast', '盲冢001.mp3')
 * // => 'http://localhost:3000/api/audio/user123/my-podcast/%E7%9B%B2%E5%86%A2001.mp3'
 * ```
 */
export function getAudioUrl(
  userId: string,
  podcastDir: string,
  fileName: string
): string {
  return `${getBaseUrl()}/api/audio/${userId}/${podcastDir}/${encodeURIComponent(fileName)}`;
}

/**
 * 生成播客封面的完整 URL（通过 API 访问）
 *
 * @param userId - 用户 ID
 * @param podcastDir - 播客目录名
 * @returns 播客封面的完整 URL
 *
 * @example
 * ```ts
 * getPodcastCoverUrl('user123', 'my-podcast')
 * // => 'http://localhost:3000/api/audio/user123/my-podcast/cover.jpg'
 * ```
 */
export function getPodcastCoverUrl(
  userId: string,
  podcastDir: string
): string {
  return `${getBaseUrl()}/api/audio/${userId}/${podcastDir}/${encodeURIComponent(storageConfig.podcastCoverName)}`;
}

/**
 * 生成剧集封面的完整 URL（通过 API 访问）
 *
 * @param userId - 用户 ID
 * @param podcastDir - 播客目录名
 * @param coverFileName - 剧集封面文件名（例如 ep-episode01.jpg）
 * @returns 剧集封面的完整 URL
 *
 * @example
 * ```ts
 * getEpisodeCoverUrl('user123', 'my-podcast', 'ep-episode01.jpg')
 * // => 'http://localhost:3000/api/audio/user123/my-podcast/ep-episode01.jpg'
 * ```
 */
export function getEpisodeCoverUrl(
  userId: string,
  podcastDir: string,
  coverFileName: string
): string {
  return `${getBaseUrl()}/api/audio/${userId}/${podcastDir}/${encodeURIComponent(coverFileName)}`;
}

/**
 * 生成 RSS Feed 的完整 URL
 *
 * @param username - 用户名
 * @param dirName - 播客目录名
 * @returns RSS Feed 的完整 URL
 *
 * @example
 * ```ts
 * getRssFeedUrl('john', 'my-podcast')
 * // => 'http://localhost:3000/feed/john/my-podcast'
 *
 * getRssFeedUrl('john', '盲冢')
 * // => 'http://localhost:3000/feed/john/%E7%9B%B2%E5%86%A2'
 * ```
 */
export function getRssFeedUrl(username: string, dirName: string): string {
  return `${getBaseUrl()}/feed/${username}/${encodeURIComponent(dirName)}`;
}

/**
 * 生成播客详情页的 URL
 *
 * @param username - 用户名
 * @param dirName - 播客目录名
 * @returns 播客详情页的 URL
 *
 * @example
 * ```ts
 * getPodcastDetailUrl('john', 'my-podcast')
 * // => 'http://localhost:3000/podcasts/john/my-podcast'
 *
 * getPodcastDetailUrl('john', '盲冢')
 * // => 'http://localhost:3000/podcasts/john/%E7%9B%B2%E5%86%A2'
 * ```
 */
export function getPodcastDetailUrl(username: string, dirName: string): string {
  return `${getBaseUrl()}/podcasts/${username}/${encodeURIComponent(dirName)}`;
}

/**
 * 获取文件的本地存储路径（相对于项目根目录）
 *
 * @param userId - 用户 ID
 * @param podcastDir - 播客目录名
 * @param fileName - 文件名（可选）
 * @returns 文件的本地存储路径
 *
 * @example
 * ```ts
 * getLocalPath('user123', 'my-podcast', 'episode01.mp3')
 * // => 'audio/user123/my-podcast/episode01.mp3'
 *
 * getLocalPath('user123', 'my-podcast')
 * // => 'audio/user123/my-podcast'
 * ```
 */
export function getLocalPath(
  userId: string,
  podcastDir: string,
  fileName?: string
): string {
  const basePath = `${storageConfig.audioDir}/${userId}/${podcastDir}`;
  return fileName ? `${basePath}/${fileName}` : basePath;
}

/**
 * 检查文件名是否为剧集封面
 *
 * @param fileName - 文件名
 * @returns 如果是剧集封面则返回 true
 *
 * @example
 * ```ts
 * isEpisodeCover('ep-episode01.jpg') // => true
 * isEpisodeCover('cover.jpg') // => false
 * isEpisodeCover('episode01.mp3') // => false
 * ```
 */
export function isEpisodeCover(fileName: string): boolean {
  return storageConfig.episodeCoverPattern.test(fileName);
}

/**
 * 从剧集封面文件名中提取对应的音频文件名
 *
 * @param coverFileName - 剧集封面文件名（例如 ep-episode01.jpg）
 * @returns 对应的音频文件名（例如 episode01）
 *
 * @example
 * ```ts
 * extractAudioFileNameFromCover('ep-episode01.jpg')
 * // => 'episode01'
 * ```
 */
export function extractAudioFileNameFromCover(coverFileName: string): string | null {
  const match = coverFileName.match(storageConfig.episodeCoverPattern);
  return match ? match[1] : null;
}
