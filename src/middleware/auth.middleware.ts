import { FastifyRequest, FastifyReply } from 'fastify';
import { isAuthenticated } from '../utils/auth';

/**
 * 认证中间件 - 要求必须登录
 *
 * 说明：
 * - 用于需要登录才能访问的路由（如创建、编辑、删除操作）
 * - 未登录返回 401 Unauthorized
 *
 * @example
 * server.post('/api/podcasts', { preHandler: requireAuth }, async (request, reply) => {
 *   // 此处用户一定已登录
 * });
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!isAuthenticated(request)) {
    return reply.code(401).send({ error: '需要登录' });
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
