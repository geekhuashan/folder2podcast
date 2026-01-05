/**
 * 数据库查询工具函数
 * 提供常用的数据库查询操作
 */

import { db } from '@/lib/db';
import { podcasts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 通过用户名查询用户
 *
 * @param username - 用户名
 * @returns 用户对象，如果不存在则返回 null
 */
export async function getUserByUsername(username: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
    .get();
}

/**
 * 通过 userId 查询用户
 *
 * @param userId - 用户 ID
 * @returns 用户对象，如果不存在则返回 null
 */
export async function getUserById(userId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .get();
}

/**
 * 通过 (username, dirName) 查询播客
 *
 * @param username - 用户名
 * @param dirName - 播客目录名
 * @returns 播客对象，如果不存在则返回 null
 */
export async function getPodcastByUsernameAndDir(
  username: string,
  dirName: string
) {
  // 先查询用户
  const user = await getUserByUsername(username);
  if (!user) {
    return null;
  }

  // 再查询播客
  return db
    .select()
    .from(podcasts)
    .where(
      and(
        eq(podcasts.userId, user.id),
        eq(podcasts.dirName, dirName)
      )
    )
    .limit(1)
    .get();
}

/**
 * 通过 (userId, dirName) 查询播客（保留用于内部使用）
 *
 * @param userId - 用户 ID
 * @param dirName - 播客目录名
 * @returns 播客对象，如果不存在则返回 null
 */
export async function getPodcastByUserAndDir(
  userId: string,
  dirName: string
) {
  return db
    .select()
    .from(podcasts)
    .where(
      and(
        eq(podcasts.userId, userId),
        eq(podcasts.dirName, dirName)
      )
    )
    .limit(1)
    .get();
}
