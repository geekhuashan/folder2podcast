import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * 简单的 API Key 认证中间件
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
