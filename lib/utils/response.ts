/**
 * JSend API 响应封装工具
 * 遵循 JSend 规范：https://github.com/omniti-labs/jsend
 *
 * JSend 定义了三种响应状态：
 * - success: 成功响应，包含数据
 * - fail: 失败响应，通常是客户端错误（如验证失败）
 * - error: 错误响应，通常是服务器错误
 */

/**
 * JSend Success 响应类型
 * 用于成功的请求
 */
export type JSendSuccess<T = any> = {
  status: 'success';
  data: T;
};

/**
 * JSend Fail 响应类型
 * 用于客户端错误（如验证失败）
 * data 字段包含具体的错误信息
 */
export type JSendFail<T = any> = {
  status: 'fail';
  data: T;
};

/**
 * JSend Error 响应类型
 * 用于服务器错误
 */
export type JSendError = {
  status: 'error';
  message: string;
  code?: number;
  data?: any;
};

/**
 * JSend 响应联合类型
 */
export type JSendResponse<T = any> = JSendSuccess<T> | JSendFail<T> | JSendError;

/**
 * 创建成功响应
 *
 * @param data - 响应数据
 * @returns JSend success 响应
 *
 * @example
 * ```ts
 * return success({ id: '123', name: 'My Podcast' });
 * // { status: 'success', data: { id: '123', name: 'My Podcast' } }
 * ```
 */
export function success<T>(data: T): JSendSuccess<T> {
  return {
    status: 'success',
    data,
  };
}

/**
 * 创建失败响应（客户端错误）
 *
 * @param data - 失败详情（通常是验证错误）
 * @returns JSend fail 响应
 *
 * @example
 * ```ts
 * return fail({ title: 'Title is required', author: 'Author must be a string' });
 * // { status: 'fail', data: { title: 'Title is required', ... } }
 * ```
 */
export function fail<T = Record<string, string>>(data: T): JSendFail<T> {
  return {
    status: 'fail',
    data,
  };
}

/**
 * 创建错误响应（服务器错误）
 *
 * @param message - 错误消息
 * @param code - 可选的错误代码
 * @param data - 可选的额外调试信息（仅开发环境使用）
 * @returns JSend error 响应
 *
 * @example
 * ```ts
 * return error('Internal server error', 500);
 * // { status: 'error', message: 'Internal server error', code: 500 }
 * ```
 */
export function error(message: string, code?: number, data?: any): JSendError {
  return {
    status: 'error',
    message,
    ...(code !== undefined && { code }),
    ...(data !== undefined && { data }),
  };
}

/**
 * 创建 Next.js Response 对象
 *
 * @param data - JSend 响应数据
 * @param status - HTTP 状态码（默认 200）
 * @returns Next.js Response 对象
 *
 * @example
 * ```ts
 * // 成功响应
 * return jsonResponse(success(podcasts), 200);
 *
 * // 失败响应（验证失败）
 * return jsonResponse(fail({ title: 'Title is required' }), 400);
 *
 * // 错误响应（服务器错误）
 * return jsonResponse(error('Database connection failed', 500), 500);
 * ```
 */
export function jsonResponse<T>(
  data: JSendResponse<T>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 常用的 HTTP 状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;
