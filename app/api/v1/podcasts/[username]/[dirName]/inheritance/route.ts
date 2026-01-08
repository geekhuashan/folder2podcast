import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { podcasts, episodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import { copyPodcastCoverToEpisode } from '@/lib/utils/cover';

/**
 * 切换播客的继承开关
 * @description 启用/禁用剧集继承,批量更新剧集数据
 * @request { inheritanceEnabled: boolean }
 * @response 200 - SuccessResponse - 更新成功
 * @security AccessKeyAuth
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; dirName: string }> }
) {
  // 1. 认证和权限验证
  const auth = await authenticateRequest(request);
  if (!auth) {
    return jsonResponse(error('Unauthorized', HTTP_STATUS.UNAUTHORIZED), HTTP_STATUS.UNAUTHORIZED);
  }

  const { username, dirName } = await params;
  const user = await getUserByUsername(username);
  if (!user || user.id !== auth.userId) {
    return jsonResponse(error('Forbidden', HTTP_STATUS.FORBIDDEN), HTTP_STATUS.FORBIDDEN);
  }

  const podcast = await getPodcastByUserAndDir(user.id, dirName);
  if (!podcast) {
    return jsonResponse(fail({ podcast: 'Podcast not found' }), HTTP_STATUS.NOT_FOUND);
  }

  // 2. 解析请求
  const body = await request.json();
  const { inheritanceEnabled } = body;

  if (typeof inheritanceEnabled !== 'boolean') {
    return jsonResponse(
      fail({ inheritanceEnabled: 'Must be a boolean value' }),
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 3. 如果值未改变,直接返回
  if (podcast.inheritanceEnabled === inheritanceEnabled) {
    return jsonResponse(success({ message: 'No change required', updatedEpisodeCount: 0 }), HTTP_STATUS.OK);
  }

  try {
    // 4. 使用事务批量更新
    const result = await db.transaction(async (tx) => {
      const allEpisodes = await tx.select()
        .from(episodes)
        .where(eq(episodes.podcastId, podcast.id))
        .all();

      // 启用继承: false → true
      if (inheritanceEnabled === true) {
        // 先在事务外复制封面文件（避免文件操作在事务中）
        for (const episode of allEpisodes) {
          try {
            const newCoverFileName = await copyPodcastCoverToEpisode(
              podcast.userId,
              podcast.dirName,
              episode.id
            );

            // 更新数据库
            await tx.update(episodes)
              .set({
                // 如果剧集描述为空或与播客描述一致,直接用播客描述
                description: (!episode.description || episode.description === podcast.description)
                  ? (podcast.description || '')
                  : episode.description,
                // 设置为剧集封面
                coverFileName: newCoverFileName,
                updatedAt: new Date(),
              })
              .where(eq(episodes.id, episode.id));
          } catch (err) {
            console.error(`[PUT Inheritance] Failed to copy cover for episode ${episode.id}:`, err);
            // 复制失败时仍然更新数据库,使用播客封面作为兜底
            await tx.update(episodes)
              .set({
                description: (!episode.description || episode.description === podcast.description)
                  ? (podcast.description || '')
                  : episode.description,
                coverFileName: 'cover.jpg',
                updatedAt: new Date(),
              })
              .where(eq(episodes.id, episode.id));
          }
        }
      }

      // 禁用继承: true → false
      if (inheritanceEnabled === false) {
        // 保持当前值不变（因为数据已经完整）
        // 不需要更新，除非用户单独上传剧集封面
      }

      // 更新播客的继承开关
      await tx.update(podcasts)
        .set({ inheritanceEnabled, updatedAt: new Date() })
        .where(eq(podcasts.id, podcast.id));

      return { episodeCount: allEpisodes.length };
    });

    // 5. 清除缓存
    clearFeedCache(podcast.id);

    console.log(`[PUT Inheritance] Updated ${result.episodeCount} episodes for podcast ${podcast.id}, inheritanceEnabled: ${inheritanceEnabled}`);

    return jsonResponse(
      success({
        message: 'Inheritance setting updated successfully',
        updatedEpisodeCount: result.episodeCount,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error('[PUT Inheritance] Transaction failed:', err);
    return jsonResponse(
      error('Failed to update inheritance setting', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
