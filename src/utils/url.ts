/**
 * URL 生成工具（统一管理所有 URL 格式）
 *
 * ## 核心设计原则
 *
 * **统一 URL 生成逻辑**：
 * 所有音频、封面、Feed 的 URL 生成都必须使用这个文件中的函数。
 * 确保前端、后端、RSS Feed 使用完全一致的 URL 格式。
 *
 * ## 文件存储 vs URL 访问的分离
 *
 * **文件存储路径**（物理磁盘）：
 * ```
 * audio/
 *   ├── {userId}/              # 用户隔离目录
 *   │   ├── {podcastName}/     # 播客目录
 *   │   │   ├── audio.mp3      # 音频文件
 *   │   │   ├── cover.jpg      # 播客封面
 *   │   │   └── ep-xxx.jpg     # 剧集封面
 * ```
 *
 * **URL 访问路径**（公开 API）：
 * ```
 * /audio/{podcastName}/{fileName}
 * ```
 * 注意：URL 中不包含 userId，userId 在路由层处理
 *
 * ## 路由解析机制
 *
 * 服务器路由 (`src/routes/audio.routes.ts`) 定义为：
 * ```
 * GET /audio/:podcastName/:fileName
 * ```
 *
 * 路由处理逻辑：
 * 1. 优先检查当前登录用户的文件：`audio/{currentUserId}/{podcastName}/{fileName}`
 * 2. 如果找不到，搜索所有用户的文件（用于 RSS Feed 公开访问）
 * 3. 维护用户隔离的同时允许公开访问
 *
 * ## 为什么要这样设计？
 *
 * 1. **用户隔离**：不同用户的播客在磁盘上物理隔离
 * 2. **简洁 URL**：RSS Feed 中的 URL 不暴露 userId，更简洁美观
 * 3. **灵活性**：路由层可以根据认证状态智能选择文件来源
 * 4. **一致性**：前端、RSS Feed、后端使用完全相同的 URL 格式
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
 * const audioUrl = getAudioUrl('我的播客', 'episode01.mp3');
 * // => http://example.com/audio/我的播客/episode01.mp3
 *
 * // 前端播放音频
 * const audioUrl = getAudioUrl(podcast.dirName, episode.fileName);
 * // => /audio/我的播客/episode01.mp3
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

const { BASE_URL } = getEnvConfig();

/**
 * 生成音频文件的公开访问 URL
 *
 * @param podcastDirName - 播客目录名（不含 userId）
 * @param fileName - 音频文件名
 * @returns 完整的音频文件 URL
 *
 * 格式: {BASE_URL}/audio/{podcastDirName}/{fileName}
 */
export function getAudioUrl(podcastDirName: string, fileName: string): string {
  return `${BASE_URL}/audio/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(fileName)}`;
}

/**
 * 生成播客封面的公开访问 URL
 *
 * @param podcastDirName - 播客目录名（不含 userId）
 * @returns 完整的封面 URL
 *
 * 格式: {BASE_URL}/audio/{podcastDirName}/cover.jpg
 */
export function getPodcastCoverUrl(podcastDirName: string): string {
  return `${BASE_URL}/audio/${encodeURIComponent(podcastDirName)}/cover.jpg`;
}

/**
 * 生成剧集封面的公开访问 URL
 *
 * @param podcastDirName - 播客目录名（不含 userId）
 * @param coverFileName - 封面文件名（例如: ep-xxx.jpg）
 * @returns 完整的封面 URL
 *
 * 格式: {BASE_URL}/audio/{podcastDirName}/{coverFileName}
 */
export function getEpisodeCoverUrl(podcastDirName: string, coverFileName: string): string {
  return `${BASE_URL}/audio/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(coverFileName)}`;
}

/**
 * 生成 RSS Feed 的公开访问 URL
 *
 * @param podcastId - 播客 ID（格式: userId:dirName）
 * @returns 完整的 Feed URL
 *
 * 格式: {BASE_URL}/feeds/{podcastId}.xml
 */
export function getFeedUrl(podcastId: string): string {
  return `${BASE_URL}/feeds/${encodeURIComponent(podcastId)}.xml`;
}

/**
 * 生成音频文件的相对路径（用于前端）
 *
 * @param podcastDirName - 播客目录名（不含 userId）
 * @param fileName - 音频文件名
 * @returns 相对路径
 *
 * 格式: /audio/{podcastDirName}/{fileName}
 */
export function getAudioRelativePath(podcastDirName: string, fileName: string): string {
  return `/audio/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(fileName)}`;
}

/**
 * 生成封面文件的相对路径（用于前端）
 *
 * @param podcastDirName - 播客目录名（不含 userId）
 * @param coverFileName - 封面文件名
 * @returns 相对路径
 *
 * 格式: /audio/{podcastDirName}/{coverFileName}
 */
export function getCoverRelativePath(podcastDirName: string, coverFileName: string): string {
  return `/audio/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(coverFileName)}`;
}
