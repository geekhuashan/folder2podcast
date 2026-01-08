import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Access Key 认证中间件
 * 用于验证 HTTP API 请求中的 Access Key
 *
 * 使用方式：
 * - 客户端在请求头中携带：Authorization: Bearer {access_key}
 * - 中间件验证 Access Key 是否有效
 * - 返回用户信息或 null
 */

/**
 * 认证结果类型
 */
export interface AuthResult {
  userId: string;
  username: string;
}

/**
 * 从请求中验证 Access Key 并返回用户信息
 *
 * @param request - Next.js 请求对象
 * @returns 用户信息或 null（验证失败）
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const auth = await authenticateRequest(request);
 *   if (!auth) {
 *     return jsonResponse(error('Unauthorized', 401), 401);
 *   }
 *
 *   // 使用 auth.userId 查询数据
 *   const podcasts = await db.select()
 *     .from(podcasts)
 *     .where(eq(podcasts.userId, auth.userId));
 * }
 * ```
 *
 * 说明：
 * - 从 Authorization 头中提取 Bearer token
 * - 验证 Access Key 格式（fp_ 开头）
 * - 从数据库查找匹配的用户（包括管理员）
 * - 返回用户信息或 null
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | null> {
  // 1. 从请求头中获取 Authorization
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    console.warn('[authenticateRequest] Missing Authorization header');
    return null;
  }

  // 2. 验证格式：Bearer {access_key}
  if (!authHeader.startsWith('Bearer ')) {
    console.warn('[authenticateRequest] Invalid Authorization format');
    return null;
  }

  // 3. 提取 Access Key
  const accessKey = authHeader.substring(7).trim();

  if (!accessKey) {
    console.warn('[authenticateRequest] Empty access key');
    return null;
  }

  // 4. 验证 Access Key 格式（可选，但有助于提前发现错误）
  if (!accessKey.startsWith('fp_')) {
    console.warn('[authenticateRequest] Invalid access key format');
    return null;
  }

  // 5. 从数据库统一查找用户（包括管理员）
  try {
    const user = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .where(eq(users.accessKey, accessKey))
      .limit(1)
      .get();

    if (!user) {
      console.warn('[authenticateRequest] Access key not found');
      return null;
    }

    console.log(`[authenticateRequest] Authenticated: ${user.username}`);
    return {
      userId: user.id,
      username: user.username,
    };
  } catch (error) {
    console.error('[authenticateRequest] Database error:', error);
    return null;
  }
}

/**
 * 生成新的 Access Key
 *
 * @returns 随机生成的 Access Key（格式：fp_xxxxxx...）
 *
 * @example
 * ```ts
 * const accessKey = generateAccessKey();
 * // => 'fp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
 * ```
 */
export function generateAccessKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const keyLength = 32;
  let key = 'fp_';

  for (let i = 0; i < keyLength; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }

  return key;
}

/**
 * 验证 Access Key 格式是否正确
 *
 * @param accessKey - 待验证的 Access Key
 * @returns 如果格式正确返回 true
 *
 * @example
 * ```ts
 * isValidAccessKeyFormat('fp_abcd1234') // => true
 * isValidAccessKeyFormat('invalid') // => false
 * ```
 */
export function isValidAccessKeyFormat(accessKey: string): boolean {
  // Access Key 必须以 fp_ 开头，且总长度为 35（fp_ + 32字符）
  if (!accessKey.startsWith('fp_')) {
    return false;
  }

  if (accessKey.length !== 35) {
    return false;
  }

  // 检查后续字符是否都是小写字母或数字
  const suffix = accessKey.substring(3);
  return /^[a-z0-9]+$/.test(suffix);
}
