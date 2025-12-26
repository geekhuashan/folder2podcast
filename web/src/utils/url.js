/**
 * URL 生成工具（前端版本）
 *
 * ## 核心设计原则（v2 更新）
 *
 * **服务端统一提供 URL**
 * - 所有媒体文件 URL（音频、封面）由后端 API 统一提供
 * - 前端直接使用后端返回的 `audioUrl` 和 `imageUrl` 字段
 * - 前端不再手动拼接媒体文件 URL
 *
 * ## URL 格式规范（后端统一）
 *
 * **音频文件 URL**（后端提供）：
 * ```
 * {BASE_URL}/audio/{userId}/{podcastDirName}/{fileName}
 * ```
 *
 * **封面文件 URL**（后端提供）：
 * ```
 * {BASE_URL}/audio/{userId}/{podcastDirName}/cover.jpg          # 播客封面
 * {BASE_URL}/audio/{userId}/{podcastDirName}/{coverFileName}   # 剧集封面
 * ```
 *
 * **RSS Feed URL**（前端生成）：
 * ```
 * /feeds/{podcastId}.xml                     # 相对路径
 * {origin}/feeds/{podcastId}.xml             # 完整 URL
 * ```
 *
 * ## 为什么前端不再构造媒体 URL？
 *
 * 1. **统一性**：确保所有地方使用完全相同的 URL
 * 2. **存储透明**：前端不需要知道是本地存储还是 S3
 * 3. **避免错误**：消除前后端 URL 不一致的风险
 * 4. **简化架构**：URL 生成逻辑只在一处（后端）
 *
 * ## 使用场景
 *
 * - ✅ **RSS Feed URL**：前端生成，用于复制订阅链接
 * - ❌ **音频/封面 URL**：后端提供，前端直接使用
 *
 * ## API 响应示例
 *
 * ```javascript
 * // 后端返回的剧集数据
 * {
 *   "fileName": "episode01.mp3",
 *   "title": "第一集",
 *   "audioUrl": "http://example.com/audio/admin/我的播客/episode01.mp3",  // ✅ 后端提供
 *   "imageUrl": "http://example.com/audio/admin/我的播客/episode01.jpg"     // ✅ 后端提供
 * }
 * ```
 *
 * ## 前端使用示例
 *
 * ```javascript
 * // ❌ 错误示例（v1 旧代码）
 * import { getAudioUrl } from '../utils/url';
 * const audioUrl = getAudioUrl(podcast.dirName, fileName);
 *
 * // ✅ 正确示例（v2 新代码）
 * const audioUrl = episode.audioUrl;  // 直接使用后端提供的 URL
 * const coverUrl = episode.imageUrl;
 * ```
 *
 * ## 相关文件
 *
 * - 后端 URL 工具：`src/utils/url.ts`（唯一的 URL 生成位置）
 * - 后端数据服务：`src/services/feed-data.service.ts`（提供完整 URL）
 * - 前端使用：`FileManager.jsx`、`EpisodeEditorModal.jsx`（直接使用后端 URL）
 */

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
 *
 * 注意：使用 __BACKEND_URL__ 而不是 window.location.origin
 * 因为前端开发服务器和后端 API 服务器可能运行在不同的地址
 */
export function getFullFeedUrl(podcastId) {
  // 使用后端服务器的地址，而不是前端的地址
  const backendUrl = typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : window.location.origin;
  return `${backendUrl}${getFeedUrl(podcastId)}`;
}
