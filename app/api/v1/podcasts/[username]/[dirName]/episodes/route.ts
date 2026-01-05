import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { generatePodcastFeedData } from '@/lib/services/feed-data.service';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import { EpisodeListResponse } from '@/lib/schemas/podcast';
import { z } from 'zod';

// 导出 schemas 供 OpenAPI 生成器使用
export { EpisodeListResponse };

// 剧集列表响应数据
const EpisodesDataResponse = z.object({
  episodes: EpisodeListResponse.describe('剧集列表'),
  total: z.number().int().min(0).describe('剧集总数'),
});
export { EpisodesDataResponse };

/**
 * 获取剧集列表
 * @description 获取指定播客的所有剧集
 * @response 200 - SuccessResponse(EpisodesDataResponse) - 成功返回剧集列表
 * @security AccessKeyAuth
 * @openapi
 */
export async function GET(
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

  // 验证权限
  if (user.id !== auth.userId) {
    return jsonResponse(
      error('Forbidden', HTTP_STATUS.FORBIDDEN),
      HTTP_STATUS.FORBIDDEN
    );
  }

  try {
    // 查询播客
    const podcast = await getPodcastByUserAndDir(user.id, dirName);

    if (!podcast) {
      return jsonResponse(
        fail({ podcast: 'Podcast not found' }),
        HTTP_STATUS.NOT_FOUND
      );
    }

    // 使用统一数据源获取剧集列表（确保与 RSS Feed 数据一致）
    const feedData = await generatePodcastFeedData(podcast.id, true);

    return jsonResponse(
      success({
        episodes: feedData.episodes,
        total: feedData.episodes.length,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[GET /api/v1/podcasts/${username}/${dirName}/episodes] Error:`, err);
    return jsonResponse(
      error('Failed to fetch episodes', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
