import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 用户表
 * 存储登录账号信息
 *
 * 说明：
 * - 密码使用明文存储（内网使用，无需加密）
 * - 默认用户：admin/admin
 */
export const users = sqliteTable('users', {
  // 用户唯一标识
  id: text('id').primaryKey(),
  // 用户名（用于登录）
  username: text('username').notNull().unique(),
  // 密码（明文存储）
  password: text('password').notNull(),
  // 昵称（显示用）
  nickname: text('nickname'),
  // 创建时间
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * 播客表
 * 存储播客的基础信息和配置
 * 替代原来的 podcast.json 文件
 *
 * 说明：
 * - id 格式: {userId}:{dirName}，例如 "admin:my-podcast"
 * - 每个用户的播客目录隔离：audio/{userId}/{dirName}/
 */
export const podcasts = sqliteTable('podcasts', {
  // 播客唯一标识（格式: userId:dirName）
  id: text('id').primaryKey(),
  // 所属用户 ID（外键关联 users 表）
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // 目录名（用于文件系统路径）
  dirName: text('dir_name').notNull(),

  // ====== 播客元数据 ======
  // 播客标题
  title: text('title').notNull(),
  // 播客描述
  description: text('description'),
  // 作者
  author: text('author'),
  // 联系邮箱
  email: text('email'),
  // 网站地址
  websiteUrl: text('website_url'),
  // 语言代码（默认中文）
  language: text('language').default('zh-cn'),
  // 分类
  category: text('category').default('Technology'),
  // 是否显式内容
  explicit: integer('explicit', { mode: 'boolean' }).default(false),

  // ====== 解析配置 ======
  // 标题格式化策略（clean/raw）
  titleFormat: text('title_format').default('clean'),
  // 剧集序号提取策略（prefix/suffix/first/last）
  episodeNumberStrategy: text('episode_number_strategy').default('prefix'),
  // 是否使用文件修改时间作为发布时间
  useMTime: integer('use_mtime', { mode: 'boolean' }).default(false),

  // ====== 时间戳 ======
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * 剧集元数据表
 * 存储剧集的自定义元数据
 * 替代原来的 episodes.json 文件
 *
 * 说明：
 * - id 格式: {podcastId}:{fileName}，例如 "admin:my-podcast:episode01.mp3"
 * - title/description/pubDate/coverUrl 为用户自定义字段（可选）
 * - duration/fileSize 为扫描时自动更新的字段
 */
export const episodes = sqliteTable('episodes', {
  // 剧集唯一标识（格式: podcastId:fileName）
  id: text('id').primaryKey(),
  // 所属播客 ID（外键关联 podcasts 表）
  podcastId: text('podcast_id').notNull().references(() => podcasts.id, { onDelete: 'cascade' }),
  // 音频文件名
  fileName: text('file_name').notNull(),

  // ====== 用户自定义元数据（可选） ======
  // 剧集标题（如果不设置，使用文件名）
  title: text('title'),
  // 剧集描述
  description: text('description'),
  // 发布时间（如果不设置，使用文件创建时间或基于序号生成）
  pubDate: integer('pub_date', { mode: 'timestamp' }),
  // 剧集封面 URL（相对路径，例如 "ep-episode01.jpg"）
  coverUrl: text('cover_url'),

  // ====== 文件信息（扫描时自动更新） ======
  // 音频时长（秒）
  duration: integer('duration'),
  // 文件大小（字节）
  fileSize: integer('file_size'),

  // ====== 时间戳 ======
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
