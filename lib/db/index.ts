import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { dbConfig } from '@/lib/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * 创建并导出数据库实例
 * 使用单例模式确保整个应用只有一个数据库连接
 */
let _db: ReturnType<typeof createDatabase> | null = null;

function createDatabase() {
  // 确保数据库目录存在
  try {
    const dbDir = dirname(dbConfig.url);
    mkdirSync(dbDir, { recursive: true });
  } catch (error) {
    // 目录可能已经存在，忽略错误
  }

  // 创建 libSQL 客户端（本地文件模式）
  const client = createClient({
    url: `file:${dbConfig.url}`
  });

  // 创建 Drizzle ORM 实例
  return drizzle(client, { schema });
}

/**
 * 获取数据库实例（单例）
 */
export function getDatabase() {
  if (!_db) {
    _db = createDatabase();
  }
  return _db;
}

/**
 * 导出默认数据库实例
 */
export const db = getDatabase();
