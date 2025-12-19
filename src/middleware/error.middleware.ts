import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
        stack?: string;
    };
}

/**
 * 错误处理中间件
 * 统一处理所有错误并返回标准格式的错误响应
 */
export async function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // 记录错误到 Fastify logger
    request.log.error({
        err: error,
        url: request.url,
        method: request.method
    }, 'Request error');

    // 确定 HTTP 状态码
    const statusCode = error.statusCode || 500;

    // 构建错误响应
    const errorResponse: ErrorResponse = {
        error: {
            code: error.code || 'INTERNAL_SERVER_ERROR',
            message: error.message || 'An unexpected error occurred'
        }
    };

    // 在开发环境包含 stack trace
    if (process.env.NODE_ENV !== 'production' && error.stack) {
        errorResponse.error.stack = error.stack;
    }

    // 如果有额外的错误详情,包含进来
    if ('validation' in error) {
        errorResponse.error.details = error.validation;
    }

    // 发送错误响应
    reply.status(statusCode).send(errorResponse);
}
