import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs-extra';
import { getEnvConfig } from '../utils/env';

// 根据存储模式决定数据库文件路径
// - 本地模式: data/podcasts-local.db
// - S3 模式: data/podcasts-s3.db
// 这样可以避免本地和 S3 数据混乱
function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  const env = getEnvConfig();
  const storageMode = env.STORAGE_MODE || 'local';
  const dbFileName = `podcasts-${storageMode}.db`;

  return path.join(process.cwd(), 'data', dbFileName);
}

const DB_PATH = getDatabasePath();

// 确保数据目录存在
fs.ensureDirSync(path.dirname(DB_PATH));

// 创建 SQLite 连接
const sqlite = new Database(DB_PATH);

// 启用 WAL 模式（Write-Ahead Logging）
// 说明：提升并发性能，允许读写同时进行
sqlite.pragma('journal_mode = WAL');

// 创建 Drizzle ORM 实例
// 说明：提供类型安全的数据库操作接口
export const db = drizzle(sqlite, { schema });

/**
 * 初始化数据库表结构和默认数据
 *
 * 说明：
 * - 应用启动时调用一次
 * - 使用 CREATE TABLE IF NOT EXISTS 避免重复创建
 * - 自动创建默认管理员账号 admin/admin
 */
export async function initDatabase() {
  console.log('🔧 Initializing database...');

  // ====== 创建表结构 ======
  sqlite.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- 播客表
    CREATE TABLE IF NOT EXISTS podcasts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dir_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      author TEXT DEFAULT 'Podcast Author',
      email TEXT DEFAULT 'change-this@example.com',
      website_url TEXT,
      language TEXT DEFAULT 'zh-cn',
      category TEXT DEFAULT 'Technology',
      explicit INTEGER DEFAULT 0,
      title_format TEXT DEFAULT 'clean',
      episode_number_strategy TEXT DEFAULT 'prefix',
      use_mtime INTEGER DEFAULT 0,
      base_pub_date INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 剧集元数据表
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      podcast_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      title TEXT,
      description TEXT,
      pub_date INTEGER,
      cover_url TEXT,
      version INTEGER DEFAULT 1,
      sort_order INTEGER,
      duration INTEGER,
      file_size INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
    );

    -- 创建索引（提升查询性能）
    CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON podcasts(user_id);
    CREATE INDEX IF NOT EXISTS idx_episodes_podcast_id ON episodes(podcast_id);
  `);

  // ====== 创建默认管理员账号 ======
  const adminExists = sqlite
    .prepare('SELECT id FROM users WHERE username = ?')
    .get('admin');

  if (!adminExists) {
    // 插入默认管理员（密码明文存储）
    sqlite
      .prepare(`
        INSERT INTO users (id, username, password, nickname)
        VALUES (?, ?, ?, ?)
      `)
      .run('admin', 'admin', 'admin', 'Administrator');

    console.log('✅ Default admin user created (username: admin, password: admin)');
  }

  // ====== 更新现有播客的空 author/email ======
  const updateResult = sqlite
    .prepare(`
      UPDATE podcasts
      SET
        author = COALESCE(NULLIF(author, ''), 'Podcast Author'),
        email = COALESCE(NULLIF(email, ''), 'change-this@example.com')
      WHERE author IS NULL OR author = '' OR email IS NULL OR email = ''
    `)
    .run();

  if (updateResult.changes > 0) {
    console.log(`✅ Updated ${updateResult.changes} podcasts with default author/email`);
  }

  console.log('✅ Database initialized at:', DB_PATH);
}
