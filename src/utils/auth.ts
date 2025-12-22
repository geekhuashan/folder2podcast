import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * 验证用户登录
 *
 * @param username - 用户名
 * @param password - 密码（明文）
 * @returns 用户对象（不含密码）或 null
 *
 * 说明：
 * - 密码直接明文比对（内网使用，无需加密）
 * - 返回的用户对象不包含密码字段
 */
export async function verifyLogin(username: string, password: string) {
  // 从数据库查询用户
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user) {
    return null;
  }

  // 明文密码比对
  if (user.password !== password) {
    return null;
  }

  // 返回用户信息（排除密码字段）
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
  };
}

/**
 * 从请求中获取当前登录用户
 *
 * @param request - Fastify 请求对象
 * @returns 用户对象或 null
 *
 * 说明：
 * - 从 Session 中读取用户信息
 * - 如果未登录返回 null
 */
export function getCurrentUser(request: any) {
  return request.session.user || null;
}

/**
 * 检查是否已登录
 *
 * @param request - Fastify 请求对象
 * @returns 是否已登录
 */
export function isAuthenticated(request: any): boolean {
  return !!request.session.user;
}
