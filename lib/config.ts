/**
 * 环境变量配置
 * 集中管理所有环境变量，提供类型安全的访问方式
 */

/**
 * 数据库配置
 */
export const dbConfig = {
  // 数据库文件路径
  url: process.env.DATABASE_URL || './data/podcasts.db',
};

/**
 * 服务器配置
 */
export const serverConfig = {
  // 服务器基础 URL（用于生成 RSS Feed 中的绝对 URL）
  // 本地开发：http://localhost:3100
  // 生产环境（有反向代理）：https://your-domain.com
  // 生产环境（直接访问）：http://your-ip:3100
  baseUrl: process.env.BASE_URL || 'http://localhost:3100',
};

/**
 * 文件存储配置
 */
export const storageConfig = {
  // 音频文件存储目录（相对于项目根目录，不在 public 中）
  audioDir: 'audio',
  // 封面文件名规范
  podcastCoverName: 'cover.jpg',
  episodeCoverPattern: /^ep-(.+)\.(jpg|png|jpeg|webp)$/i,
  // 文件大小限制
  maxAudioFileSize: 500 * 1024 * 1024, // 500MB
  maxImageFileSize: 10 * 1024 * 1024,  // 10MB
};

/**
 * Access Key 配置
 */
export const authConfig = {
  // Access Key 前缀
  keyPrefix: 'fp_',
  // Access Key 长度（不包含前缀）
  keyLength: 32,
};

/**
 * RSS Feed 配置
 */
export const feedConfig = {
  // Feed 缓存时间（秒）
  cacheMaxAge: 300,
  // Feed 生成器信息
  generator: 'Folder2Podcast Next.js',
};
