/**
 * URL 生成工具（前端版本）
 *
 * ## 核心设计原则
 *
 * **与后端保持完全一致的 URL 格式**
 * - 本文件是 `src/utils/url.ts` 的前端版本
 * - 所有函数的 URL 生成逻辑必须与后端保持一致
 * - 确保前端页面预览和 RSS Feed 使用相同的 URL
 *
 * ## URL 格式规范
 *
 * **音频文件 URL**：
 * ```
 * /audio/{podcastDirName}/{fileName}
 * ```
 *
 * **封面文件 URL**：
 * ```
 * /audio/{podcastDirName}/cover.jpg          # 播客封面
 * /audio/{podcastDirName}/{coverFileName}    # 剧集封面
 * ```
 *
 * **RSS Feed URL**：
 * ```
 * /feeds/{podcastId}.xml                     # 相对路径
 * {origin}/feeds/{podcastId}.xml             # 完整 URL
 * ```
 *
 * ## 为什么需要这个文件？
 *
 * 1. **统一性**：所有前端组件使用相同的 URL 生成逻辑
 * 2. **一致性**：与后端和 RSS Feed 生成的 URL 保持完全一致
 * 3. **可维护性**：URL 格式变更时只需修改这一个文件
 * 4. **零错误**：避免手动拼接 URL 导致的格式不一致
 *
 * ## 使用场景
 *
 * - 文件管理器：显示音频文件的播放链接
 * - 播客列表：复制 RSS 订阅链接
 * - 配置编辑器：显示封面图片预览
 * - 剧集编辑器：显示剧集封面
 *
 * ## 重要约定
 *
 * ⚠️ **禁止在组件中手动拼接 URL**
 * ```javascript
 * // ❌ 错误示例
 * const url = `/audio/${podcast.dirName}/${fileName}`;
 *
 * // ✅ 正确示例
 * import { getAudioUrl } from '../utils/url';
 * const url = getAudioUrl(podcast.dirName, fileName);
 * ```
 *
 * ## 相关文件
 *
 * - 后端 URL 工具：`src/utils/url.ts`（与本文件保持一致）
 * - 使用本工具的组件：
 *   - `FileManager.jsx`
 *   - `PodcastList.jsx`
 *   - `ConfigBasicInfo.jsx`
 *   - `EpisodeDetailsPanel.jsx`
 */

/**
 * 生成音频文件的相对路径
 *
 * @param {string} podcastDirName - 播客目录名（不含 userId）
 * @param {string} fileName - 音频文件名
 * @returns {string} 相对路径
 *
 * 格式: /audio/{podcastDirName}/{fileName}
 */
export function getAudioUrl(podcastDirName, fileName) {
  return `/audio/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(fileName)}`;
}

/**
 * 生成播客封面的相对路径
 *
 * @param {string} podcastDirName - 播客目录名（不含 userId）
 * @returns {string} 相对路径
 *
 * 格式: /audio/{podcastDirName}/cover.jpg
 */
export function getPodcastCoverUrl(podcastDirName) {
  return `/audio/${encodeURIComponent(podcastDirName)}/cover.jpg`;
}

/**
 * 生成剧集封面的相对路径
 *
 * @param {string} podcastDirName - 播客目录名（不含 userId）
 * @param {string} coverFileName - 封面文件名（例如: ep-xxx.jpg）
 * @returns {string} 相对路径
 *
 * 格式: /audio/{podcastDirName}/{coverFileName}
 */
export function getEpisodeCoverUrl(podcastDirName, coverFileName) {
  return `/audio/${encodeURIComponent(podcastDirName)}/${encodeURIComponent(coverFileName)}`;
}

/**
 * 生成 RSS Feed 的相对路径
 *
 * @param {string} podcastId - 播客 ID（格式: userId:dirName）
 * @returns {string} 相对路径
 *
 * 格式: /feeds/{podcastId}.xml
 */
export function getFeedUrl(podcastId) {
  return `/feeds/${encodeURIComponent(podcastId)}.xml`;
}

/**
 * 生成 RSS Feed 的完整 URL（包含域名）
 *
 * @param {string} podcastId - 播客 ID（格式: userId:dirName）
 * @returns {string} 完整 URL
 */
export function getFullFeedUrl(podcastId) {
  return `${window.location.origin}${getFeedUrl(podcastId)}`;
}
