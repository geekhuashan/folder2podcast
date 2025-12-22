import { FastifyInstance } from 'fastify';
import { verifyLogin, getCurrentUser } from '../utils/auth';

/**
 * 认证路由
 *
 * 说明：
 * - 提供登录、登出、获取当前用户信息的接口
 * - 使用 Session 管理登录状态
 */
export async function authRoutes(server: FastifyInstance) {
  /**
   * 用户登录
   * POST /api/auth/login
   *
   * 说明：
   * - 验证用户名和密码（明文比对）
   * - 登录成功后将用户信息存入 Session
   *
   * @param request.body.username - 用户名
   * @param request.body.password - 密码
   * @returns { success: true, user: { id, username, nickname } }
   */
  server.post<{ Body: { username: string; password: string } }>(
    '/api/auth/login',
    async (request, reply) => {
      const { username, password } = request.body;

      // 验证用户名和密码
      const user = await verifyLogin(username, password);
      if (!user) {
        return reply.code(401).send({ error: '用户名或密码错误' });
      }

      // 存储到 Session
      request.session.user = user;

      // 显式保存 Session（确保持久化）
      await new Promise<void>((resolve, reject) => {
        request.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        success: true,
        user,
      };
    }
  );

  /**
   * 用户登出
   * POST /api/auth/logout
   *
   * 说明：
   * - 清除 Session
   * - 无需登录即可调用（幂等操作）
   *
   * @returns { success: true }
   */
  server.post('/api/auth/logout', async (request, reply) => {
    // 清除 Session
    request.session.destroy();

    return { success: true };
  });

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   *
   * 说明：
   * - 返回当前登录用户的信息
   * - 未登录返回 401
   *
   * @returns { user: { id, username, nickname } }
   */
  server.get('/api/auth/me', async (request, reply) => {
    const user = getCurrentUser(request);

    if (!user) {
      return reply.code(401).send({ error: '未登录' });
    }

    return { user };
  });
}
