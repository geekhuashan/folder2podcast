import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 用户表
 * 支持多用户系统，每个用户有独立的 Access Key
 *
 * 说明：
 * - Access Key 格式：fp_ + 32位随机字符串
 * - 用户数据隔离通过 userId 字段实现
 * - 每个用户的文件存储在 public/audio/{userId}/ 目录下
 */
export const users = sqliteTable('users', {
  // 用户唯一标识（UUID）
  id: text('id').primaryKey(),
  // 用户名（唯一）
  username: text('username').notNull().unique(),
  // Access Key（类似 API Key，用于 HTTP API 认证）
  accessKey: text('access_key').notNull().unique(),
  // 密码（可选，明文存储）
  password: text('password'),
  // 创建时间
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  // 为 Access Key 创建索引，加速认证查询
  accessKeyIdx: index('users_access_key_idx').on(table.accessKey),
}));

/**
 * 播客表
 * 存储播客的基础信息和配置
 *
 * 说明：
 * - 每个播客属于一个用户
 * - dirName 用于文件系统路径：public/audio/{userId}/{dirName}/
 * - 播客元数据遵循 RSS 2.0 标准
 */
export const podcasts = sqliteTable('podcasts', {
  // 播客唯一标识（UUID）
  id: text('id').primaryKey(),
  // 所属用户 ID（外键关联 users 表）
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // 目录名（URL 友好，用于文件系统路径）
  dirName: text('dir_name').notNull(),

  // ====== 播客元数据（遵循 RSS 2.0 标准）======
  // 播客标题
  title: text('title').notNull(),
  // 播客描述
  description: text('description').default(''),
  // 作者
  author: text('author').default(''),
  // 联系邮箱
  email: text('email').default(''),
  // 网站地址
  websiteUrl: text('website_url').default(''),
  // 语言代码（默认中文）
  language: text('language').default('zh-cn'),
  // 分类
  category: text('category').default('Technology'),
  // 是否包含显式内容
  explicit: integer('explicit', { mode: 'boolean' }).default(false),
  // 剧集是否继承播客设置（封面、作者等）
  inheritanceEnabled: integer('inheritance_enabled', { mode: 'boolean' }).default(true),

  // ====== 时间戳 ======
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  // 为 userId 创建索引，加速用户查询
  userIdIdx: index('podcasts_user_id_idx').on(table.userId),
  // 为 (userId, dirName) 创建复合索引，加速播客查询
  userDirIdx: index('podcasts_user_dir_idx').on(table.userId, table.dirName),
}));

/**
 * 剧集表
 * 存储剧集的元数据和文件信息
 *
 * 说明：
 * - 每个剧集属于一个播客
 * - fileName 对应实际的音频文件
 * - coverFileName 为可选的剧集封面（如 episode001.jpg）
 * - duration 单位为秒
 */
export const episodes = sqliteTable('episodes', {
  // 剧集唯一标识（UUID）
  id: text('id').primaryKey(),
  // 所属播客 ID（外键关联 podcasts 表，级联删除）
  podcastId: text('podcast_id').notNull().references(() => podcasts.id, { onDelete: 'cascade' }),
  // 音频文件名（例如 episode001.mp3）
  fileName: text('file_name').notNull(),
  // 文件大小（字节）
  fileSize: integer('file_size').notNull(),

  // ====== 剧集元数据 ======
  // 剧集标题（从音频元数据或文件名提取）
  title: text('title').notNull(),
  // 剧集描述（可选）
  description: text('description'),
  // 发布时间（从文件修改时间获取）
  pubDate: integer('pub_date', { mode: 'timestamp' }).notNull(),
  // 音频时长（秒，支持小数）
  duration: real('duration'),

  // ====== 封面信息 ======
  // 剧集封面文件名（可选，例如 episode001.jpg）
  // 如果不设置，使用播客封面（cover.jpg）
  coverFileName: text('cover_file_name'),

  // ====== 排序和版本 ======
  // 排序序号（用于自定义剧集顺序）
  sortOrder: integer('sort_order'),
  // 版本号（用于重新发布功能）
  version: integer('version').default(1),

  // ====== 时间戳 ======
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  // 为 podcastId 创建索引，加速剧集查询
  podcastIdIdx: index('episodes_podcast_id_idx').on(table.podcastId),
}));

// ====== 类型导出 ======
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Podcast = typeof podcasts.$inferSelect;
export type NewPodcast = typeof podcasts.$inferInsert;

export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;
