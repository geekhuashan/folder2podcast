/**
 * 环境变量配置
 * 集中管理所有环境变量，提供类型安全的访问方式
 */

/**
 * 解析 USERS 环境变量
 * 格式：user1:pass1,user2:pass2,user3:pass3
 *
 * @param usersEnv - USERS 环境变量的值
 * @returns 解析后的用户数组
 */
function parseUsersFromEnv(usersEnv?: string): Array<{ username: string; password: string }> {
  if (!usersEnv) return [];

  const users: Array<{ username: string; password: string }> = [];
  const pairs = usersEnv.split(',');

  for (const pair of pairs) {
    const [username, password] = pair.split(':').map(s => s.trim());

    if (username && password) {
      users.push({ username, password });
    } else {
      console.warn(`[Config] Invalid user format: "${pair}", expected "username:password"`);
    }
  }

  return users;
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

  // 批量用户配置（新增）
  // 通过 USERS 环境变量批量创建固定用户
  // 格式：user1:pass1,user2:pass2,user3:pass3
  users: parseUsersFromEnv(process.env.USERS),

  // 单用户管理员配置（兼容旧配置）
  // 如果设置了 ADMIN_USERNAME 和 ADMIN_PASSWORD，将创建单个管理员用户
  admin: {
    username: process.env.ADMIN_USERNAME || '',
    password: process.env.ADMIN_PASSWORD || '',
  },

  // 是否允许用户注册（自动判断）
  // - 如果设置了 USERS 或 ADMIN_USERNAME，禁止注册（固定用户模式）
  // - 如果都没设置，允许注册（开放注册模式）
  get enableRegistration() {
    return !this.users.length && !this.admin.username;
  },

  // 获取所有初始用户（包括管理员和批量用户）
  // 优先使用 USERS，其次使用 ADMIN_USERNAME
  get initialUsers() {
    const users: Array<{ username: string; password: string }> = [];

    // 优先使用 USERS（如果设置了）
    if (this.users.length > 0) {
      return this.users;
    }

    // 其次使用 ADMIN_USERNAME（如果设置了）
    if (this.admin.username && this.admin.password) {
      users.push({
        username: this.admin.username,
        password: this.admin.password,
      });
    }

    return users;
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
