/**
 * API 请求日志工具
 * 统一记录所有 API 请求和响应的日志
 */

import { NextRequest } from 'next/server';

/**
 * 日志颜色（用于开发环境）
 */
const COLORS = {
  RESET: '\x1b[0m',
  INFO: '\x1b[36m',    // Cyan
  SUCCESS: '\x1b[32m', // Green
  WARN: '\x1b[33m',    // Yellow
  ERROR: '\x1b[31m',   // Red
};

/**
 * 获取状态码对应的颜色
 */
function getStatusColor(status: number): string {
  if (status >= 500) return COLORS.ERROR;
  if (status >= 400) return COLORS.WARN;
  if (status >= 300) return COLORS.INFO;
  return COLORS.SUCCESS;
}

/**
 * 获取状态码文本
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'CREATED',
    204: 'NO_CONTENT',
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return statusTexts[status] || 'UNKNOWN';
}

/**
 * 获取请求路径（不含查询参数）
 */
function getPath(request: NextRequest): string {
  return request.nextUrl.pathname;
}

/**
 * API 日志工具类
 */
export class ApiLogger {
  private method: string;
  private path: string;
  private startTime: number;

  constructor(private request: NextRequest) {
    this.method = request.method;
    this.path = getPath(request);
    this.startTime = Date.now();
  }

  /**
   * 记录请求开始
   */
  logRequest(): void {
    console.log(`${COLORS.INFO}[API] ${this.method} ${this.path} - Request received${COLORS.RESET}`);
  }

  /**
   * 记录成功响应
   */
  logSuccess(status: number, message?: string, data?: any): void {
    const duration = Date.now() - this.startTime;
    const color = getStatusColor(status);
    const statusText = getStatusText(status);
    let log = `${color}[API] ${this.method} ${this.path} - ${status} ${statusText}`;

    if (message) {
      log += ` - ${message}`;
    }

    log += ` (${duration}ms)${COLORS.RESET}`;

    console.log(log, data ? { data } : '');
  }

  /**
   * 记录警告响应（400-499）
   */
  logWarning(status: number, message?: string, data?: any): void {
    const duration = Date.now() - this.startTime;
    const statusText = getStatusText(status);
    let log = `${COLORS.WARN}[API] ${this.method} ${this.path} - ${status} ${statusText}`;

    if (message) {
      log += ` - ${message}`;
    }

    log += ` (${duration}ms)${COLORS.RESET}`;

    console.warn(log, data ? { data } : '');
  }

  /**
   * 记录错误响应（500+）
   */
  logError(status: number, message?: string, error?: any): void {
    const duration = Date.now() - this.startTime;
    const statusText = getStatusText(status);
    let log = `${COLORS.ERROR}[API] ${this.method} ${this.path} - ${status} ${statusText}`;

    if (message) {
      log += ` - ${message}`;
    }

    log += ` (${duration}ms)${COLORS.RESET}`;

    console.error(log, error || '');
  }

  /**
   * 自动选择合适的日志方法
   */
  log(status: number, message?: string, data?: any): void {
    if (status >= 500) {
      this.logError(status, message, data);
    } else if (status >= 400) {
      this.logWarning(status, message, data);
    } else {
      this.logSuccess(status, message, data);
    }
  }
}

/**
 * 创建 API 日志记录器
 */
export function createApiLogger(request: NextRequest): ApiLogger {
  const logger = new ApiLogger(request);
  logger.logRequest();
  return logger;
}

