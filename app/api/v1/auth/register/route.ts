/**
 * 用户注册 API
 * POST /api/v1/auth/register
 * 创建新用户并返回 Access Key
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateAccessKey } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { v4 as uuidv4 } from 'uuid';
import { RegisterRequest, RegisterResponseData } from '@/lib/schemas/auth';
import { authConfig } from '@/lib/config';

// 导出 schemas 供 OpenAPI 生成器使用
export { RegisterRequest, RegisterResponseData };

/**
 * 用户注册
 * @description 创建新用户账户并返回访问密钥
 * @request RegisterRequest
 * @response 201 - SuccessResponse(RegisterResponseData) - 注册成功
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否允许注册
    if (!authConfig.enableRegistration) {
      return jsonResponse(
        error('注册功能已关闭', HTTP_STATUS.FORBIDDEN),
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 解析请求体
    const body = await request.json();

    // 使用 Zod 验证请求
    const parseResult = RegisterRequest.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      return jsonResponse(
        fail({
          username: errors.username?.[0],
          password: errors.password?.[0],
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { username, password } = parseResult.data;

    // 检查用户名是否存在
    const existingUser = await db.select().from(users)
      .where(eq(users.username, username)).get();
    if (existingUser) {
      return jsonResponse(
        fail({ username: '用户名已存在' }),
        HTTP_STATUS.CONFLICT
      );
    }

    // 生成 Access Key
    const accessKey = generateAccessKey();

    // 创建用户（直接使用 username 作为 userId）
    const userId = username;
    const now = new Date().toISOString();
    await db.insert(users).values({
      id: userId,
      username,
      accessKey,
      password: password,  // 明文存储密码
    });

    return jsonResponse(
      success({
        userId,
        username,
        accessKey,
        createdAt: now
      }),
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    console.error('[POST /api/v1/auth/register] Error:', err);
    return jsonResponse(
      error('注册失败', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
