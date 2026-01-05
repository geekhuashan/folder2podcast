/**
 * 获取当前用户信息 API
 * GET /api/v1/auth/me
 * 根据 Access Key 返回用户信息
 */

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';

/**
 * 获取当前用户信息
 */
export async function GET(request: NextRequest) {
  try {
    // 认证请求
    const auth = await authenticateRequest(request);
    if (!auth) {
      return jsonResponse(
        error('未授权', HTTP_STATUS.UNAUTHORIZED),
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    return jsonResponse(
      success({
        userId: auth.userId,
        username: auth.username,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error('[GET /api/v1/auth/me] Error:', err);
    return jsonResponse(
      error('获取用户信息失败', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
