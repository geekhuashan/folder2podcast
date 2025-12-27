import { getEnvConfig } from './env';

/**
 * 验证用户登录
 *
 * @param username - 用户名
 * @param password - 密码（明文）
 * @returns 用户对象或 null
 *
 * 说明：
 * - 不再使用数据库，直接验证环境变量中的用户名密码
 * - 密码直接明文比对（内网使用，无需加密）
 * - 如果没有配置环境变量，则允许任意用户名密码登录（开发模式）
 */
export async function verifyLogin(username: string, password: string) {
  const env = getEnvConfig();
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = env;

  // 如果没有配置环境变量，允许任意用户名密码登录（开发模式）
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return {
      id: 'dev-user',
      username: username || 'dev-user',
      nickname: '开发用户',
    };
  }

  // 验证环境变量中的用户名密码
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return null;
  }

  // 返回用户信息
  return {
    id: ADMIN_USERNAME,
    username: ADMIN_USERNAME,
    nickname: '管理员',
  };
}

/**
 * 从请求中获取当前登录用户
 *
 * @param request - Fastify 请求对象
 * @returns 用户对象或 null
 *
 * 说明：
 * - 从 Session 中读取用户信息（兼容旧代码）
 * - 如果未登录返回 null
 */
export function getCurrentUser(request: any) {
  return request.session?.user || null;
}

/**
 * 检查是否已登录
 *
 * @param request - Fastify 请求对象
 * @returns 是否已登录
 */
export function isAuthenticated(request: any): boolean {
  return !!request.session?.user;
}
