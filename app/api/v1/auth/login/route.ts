/**
 * 用户登录 API
 * POST /api/v1/auth/login
 * 验证用户名密码并返回 Access Key
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/utils/password';
import { success, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { LoginRequest, LoginResponseData } from '@/lib/schemas/auth';
import { SuccessResponse } from '@/lib/schemas/common';

// 导出 schemas 供 OpenAPI 生成器使用
export { LoginRequest, LoginResponseData };

/**
 * 用户登录
 * @description 验证用户名和密码，返回访问密钥（Access Key）
 * @request LoginRequest
 * @response 200 - SuccessResponse(LoginResponseData) - 登录成功
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 使用 Zod 验证请求
    const parseResult = LoginRequest.safeParse(body);
    if (!parseResult.success) {
      return jsonResponse(
        error('请求参数格式错误: ' + parseResult.error.message, HTTP_STATUS.BAD_REQUEST),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { username, password } = parseResult.data;

    // 统一从数据库查找用户（包括管理员）
    const user = await db.select().from(users)
      .where(eq(users.username, username)).get();

    // 统一错误消息（防止用户名枚举攻击）
    if (!user || !user.password) {
      return jsonResponse(
        error('用户名或密码错误', HTTP_STATUS.UNAUTHORIZED),
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // 验证密码（明文比较）
    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return jsonResponse(
        error('用户名或密码错误', HTTP_STATUS.UNAUTHORIZED),
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // 返回 Access Key
    return jsonResponse(
      success({
        userId: user.id,
        username: user.username,
        accessKey: user.accessKey,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error('[POST /api/v1/auth/login] Error:', err);
    return jsonResponse(
      error('登录失败', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
