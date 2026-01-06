/**
 * 环境变量配置
 * 集中管理所有环境变量，提供类型安全的访问方式
 */

import crypto from 'crypto';

/**
 * 生成管理员 Access Key
 * 基于用户名和密码生成确定性的 Key，确保修改密码后旧 Key 失效
 */
function generateAdminAccessKey(username: string, password: string): string {
  if (!username || !password) {
    return '';
  }

  // 使用 SHA-256 哈希生成确定性的 Access Key
  const hash = crypto
    .createHash('sha256')
    .update(`${username}:${password}`)
    .digest('hex');

  // 取前 32 位，加上 fp_ 前缀（总长度 35）
  return `fp_${hash.slice(0, 32)}`;
}

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
  // 服务器端口
  port: Number.parseInt(process.env.PORT || '3100', 10),

  // 服务器基础 URL（不包含端口号）
  // 本地开发：http://localhost
  // 生产环境（有反向代理）：https://your-domain.com
  // 生产环境（直接访问）：http://your-ip
  baseUrl: process.env.BASE_URL || 'http://localhost',
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
 * 认证配置
 */
export const authConfig = {
  // Access Key 前缀
  keyPrefix: 'fp_',
  // Access Key 长度（不包含前缀）
  keyLength: 32,

  // 是否允许用户注册（默认 true）
  enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',

  // 管理员账号配置（可选）
  // 如果设置了管理员账号，可以使用管理员账号密码直接登录，无需数据库
  // Access Key 会基于用户名和密码自动生成
  admin: {
    username: process.env.ADMIN_USERNAME || '',
    password: process.env.ADMIN_PASSWORD || '',
    // Access Key 自动生成（不再从环境变量读取）
    get accessKey() {
      return generateAdminAccessKey(this.username, this.password);
    },
  },

  // 是否启用了管理员账号
  get hasAdminAccount() {
    return Boolean(this.admin.username && this.admin.password);
  },
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
