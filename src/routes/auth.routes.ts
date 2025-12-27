import { FastifyInstance } from 'fastify';
import { verifyLogin } from '../utils/auth';

/**
 * 认证路由（简化版）
 *
 * 说明：
 * - 只提供登录验证接口（不创建 Session）
 * - 验证用户名密码是否与环境变量匹配
 */
export async function authRoutes(server: FastifyInstance) {
  /**
   * 验证用户登录
   * POST /api/auth/login
   *
   * 说明：
   * - 验证用户名和密码是否与环境变量匹配
   * - 不创建 Session，只返回验证结果
   * - 前端保存用户名密码到 localStorage，后续请求通过 URL 参数传递
   *
   * @param request.body.username - 用户名
   * @param request.body.password - 密码
   * @returns { success: true, user: { id, username, nickname } }
   */
  server.post<{ Body: { username: string; password: string } }>(
    '/api/auth/login',
    async (request, reply) => {
      const { username, password } = request.body;

      // 验证用户名和密码（检查环境变量）
      const user = await verifyLogin(username, password);
      if (!user) {
        return reply.code(401).send({ error: '用户名或密码错误' });
      }

      return {
        success: true,
        user,
      };
    }
  );
}
