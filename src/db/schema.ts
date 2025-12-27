import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 播客表
 * 存储播客的基础信息和配置
 * 替代原来的 podcast.json 文件
 *
 * 说明：
 * - id 格式: {userId}:{dirName}，例如 "admin:my-podcast"
 * - 每个用户的播客目录隔离：audio/{userId}/{dirName}/
 * - userId 从认证中间件获取（通过环境变量 ADMIN_USERNAME）
 */
export const podcasts = sqliteTable('podcasts', {
  // 播客唯一标识（格式: userId:dirName）
  id: text('id').primaryKey(),
  // 所属用户 ID（不再使用外键，直接存储用户标识符）
  userId: text('user_id').notNull(),
  // 目录名（用于文件系统路径）
  dirName: text('dir_name').notNull(),

  // ====== 播客元数据 ======
  // 播客标题
  title: text('title').notNull(),
  // 播客描述
  description: text('description'),
  // 作者（默认值：提示用户修改）
  author: text('author').default('Podcast Author'),
  // 联系邮箱（默认值：明显的占位符，提示用户修改）
  email: text('email').default('change-this@example.com'),
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

  // ====== 排序配置 ======
  // pubDate 生成的基准时间（可选）
  // 如果设置，pubDate = basePubDate + (sortOrder - 1) * 24小时
  // 如果不设置，使用 sortOrder 最小的剧集的文件创建时间作为基准
  basePubDate: integer('base_pub_date', { mode: 'timestamp' }),

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

  // ====== 重新发布机制 ======
  // 版本号（用于"重新发布"功能，改变 GUID）
  // 默认为 1，每次"重新发布"时 +1
  // GUID 格式：version=1 时为原始 URL，version>1 时为 URL?v=2
  version: integer('version').default(1),

  // ====== 排序机制 ======
  // 固定序号（用于控制排序）
  // 序号越小越新：sortOrder=1 排在最前面
  // pubDate 根据 sortOrder 自动生成
  sortOrder: integer('sort_order'),

  // ====== 文件信息（扫描时自动更新） ======
  // 音频时长（秒）
  duration: integer('duration'),
  // 文件大小（字节）
  fileSize: integer('file_size'),

  // ====== 时间戳 ======
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
