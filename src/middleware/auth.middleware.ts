import { FastifyRequest, FastifyReply } from 'fastify';
import { getEnvConfig } from '../utils/env';

/**
 * 认证中间件 - 要求必须登录
 *
 * 说明：
 * - 读操作（GET/HEAD）：不需要认证，访客可以访问
 * - 写操作（POST/PUT/DELETE）：需要管理员用户名和密码
 * - 从查询参数中读取 username 和 password
 *
 * @example
 * server.post('/api/podcasts', { preHandler: requireAuth }, async (request, reply) => {
 *   // 此处用户一定已通过认证
 * });
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const env = getEnvConfig();
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = env;

  // 如果没有配置用户名密码，则允许所有操作（开发模式）
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return;
  }

  // 读操作（GET/HEAD）不需要认证 - 访客可以访问
  const isReadOnly = request.method === 'GET' || request.method === 'HEAD';
  if (isReadOnly) {
    return; // 读操作直接放行
  }

  // 写操作（POST/PUT/DELETE/PATCH）需要用户名和密码 - 管理员权限
  const { username, password } = request.query as { username?: string; password?: string };
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Write operations require admin credentials. Add ?username=USER&password=PASS to URL.'
    });
  }
}

/**
 * 可选认证中间件
 *
 * 说明：
 * - 不强制登录，但会设置用户信息到请求上下文
 * - 用于既可以公开访问又需要识别用户的路由（如 Feed）
 * - 未登录也可以继续访问
 *
 * @example
 * server.get('/feeds/:id.xml', { preHandler: optionalAuth }, async (request, reply) => {
 *   const user = getCurrentUser(request); // 可能为 null
 * });
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  // 不做任何拦截，只是标记用户信息
  // 具体业务逻辑通过 getCurrentUser() 判断
}

/**
 * 简单的 API Key 认证中间件（保留旧版兼容）
 * 从查询参数中读取 apiKey，如果设置了环境变量 API_KEY 则进行验证
 */
export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
    const configuredApiKey = process.env.API_KEY;

    // 如果没有配置 API_KEY，则不进行认证
    if (!configuredApiKey) {
        return;
    }

    // 从查询参数中获取 apiKey
    const { apiKey } = request.query as { apiKey?: string };

    // 验证 API Key
    if (!apiKey || apiKey !== configuredApiKey) {
        reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid or missing API key'
        });
    }
}
