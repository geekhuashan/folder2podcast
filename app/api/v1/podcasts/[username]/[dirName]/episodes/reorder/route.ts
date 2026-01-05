/**
 * 剧集批量排序 API
 * POST /api/v1/podcasts/[id]/episodes/reorder
 *
 * 支持两种操作：
 * - action: 'preview' - 预览排序结果（不修改数据）
 * - action: 'apply' - 应用排序结果（批量更新 sortOrder）
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { episodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import { previewReorder, type SortStrategy } from '@/lib/utils/episode-sorter';
import {
  PodcastIdParam,
  ReorderEpisodesRequestV2,
  ReorderPreviewResponse,
  ReorderApplyResponse,
} from '@/lib/schemas/podcast';

// 导出 schemas 供 OpenAPI 生成器使用
export { PodcastIdParam, ReorderEpisodesRequestV2, ReorderPreviewResponse, ReorderApplyResponse };

/**
 * 剧集重排序
 * @description 根据策略重新排序剧集（支持预览和应用两种模式）
 * @pathParams PodcastIdParam
 * @request ReorderEpisodesRequestV2
 * @response 200 - SuccessResponse(ReorderPreviewResponse | ReorderApplyResponse) - 成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; dirName: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return jsonResponse(
      error('Unauthorized', HTTP_STATUS.UNAUTHORIZED),
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const { username, dirName } = await params;

  // 通过 username 查询用户
  const user = await getUserByUsername(username);
  if (!user) {
    return jsonResponse(
      fail({ user: 'User not found' }),
      HTTP_STATUS.NOT_FOUND
    );
  }

  // 验证权限：username 对应的 userId 必须匹配认证用户
  if (user.id !== auth.userId) {
    return jsonResponse(
      error('Forbidden', HTTP_STATUS.FORBIDDEN),
      HTTP_STATUS.FORBIDDEN
    );
  }

  try {
    // 通过 (userId, dirName) 查询播客
    const podcast = await getPodcastByUserAndDir(user.id, dirName);

    if (!podcast) {
      return jsonResponse(
        fail({ podcast: 'Podcast not found' }),
        HTTP_STATUS.NOT_FOUND
      );
    }

    // 解析请求体
    const body = await request.json();

    // 使用 Zod 验证请求
    const parseResult = ReorderEpisodesRequestV2.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      return jsonResponse(
        fail({
          strategy: errors.strategy?.[0],
          action: errors.action?.[0],
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { strategy, action } = parseResult.data;

    // 获取所有剧集
    const episodeList = await db
      .select()
      .from(episodes)
      .where(eq(episodes.podcastId, podcast.id))
      .all();

    if (episodeList.length === 0) {
      return jsonResponse(
        fail({ episodes: 'No episodes found in this podcast' }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 预览排序结果
    const preview = previewReorder(episodeList, strategy);

    // 如果是预览操作，直接返回预览结果
    if (action === 'preview') {
      return jsonResponse(
        success(preview),
        HTTP_STATUS.OK
      );
    }

    // 如果是应用操作，批量更新 sortOrder
    if (action === 'apply') {
      // 使用事务批量更新
      await db.transaction(async (tx) => {
        for (const item of preview.episodes) {
          await tx
            .update(episodes)
            .set({
              sortOrder: item.newSortOrder,
              updatedAt: new Date(),
            })
            .where(eq(episodes.id, item.id));
        }
      });

      // 清除 Feed 缓存
      clearFeedCache(podcast.id);

      return jsonResponse(
        success({
          message: 'Episodes reordered successfully',
          strategy: preview.strategy,
          total: preview.total,
          changed: preview.changed,
        }),
        HTTP_STATUS.OK
      );
    }

    // 理论上不会到达这里
    return jsonResponse(
      error('Unknown error', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  } catch (err) {
    console.error(`[POST /api/v1/podcasts/${username}/${dirName}/episodes/reorder] Error:`, err);
    return jsonResponse(
      error('Failed to reorder episodes', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
