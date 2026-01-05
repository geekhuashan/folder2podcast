/**
 * 剧集编辑 API
 * PUT /api/v1/podcasts/[id]/episodes/[episodeId] - 更新剧集元数据
 * DELETE /api/v1/podcasts/[id]/episodes/[episodeId] - 删除剧集
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import { podcasts, episodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { getLocalPath } from '@/lib/utils/url';
import { unlink } from 'fs/promises';
import { join } from 'path';
import {
  PodcastIdParam,
  EpisodeIdParam,
  UpdateEpisodeRequest,
  Episode,
  DeleteEpisodeResponse,
} from '@/lib/schemas/podcast';

// 导出 schemas 供 OpenAPI 生成器使用
export { PodcastIdParam, EpisodeIdParam, UpdateEpisodeRequest, Episode, DeleteEpisodeResponse };

/**
 * 更新剧集元数据
 * @description 更新剧集的标题、描述、排序等信息
 * @pathParams PodcastIdParam
 * @pathParams EpisodeIdParam
 * @request UpdateEpisodeRequest
 * @response 200 - SuccessResponse(Episode) - 更新成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; dirName: string; episodeId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return jsonResponse(
      error('Unauthorized', HTTP_STATUS.UNAUTHORIZED),
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const { username, dirName, episodeId } = await params;

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

    // 验证剧集是否存在
    const episode = await db
      .select()
      .from(episodes)
      .where(and(
        eq(episodes.id, episodeId),
        eq(episodes.podcastId, podcast.id)
      ))
      .limit(1)
      .get();

    if (!episode) {
      return jsonResponse(
        fail({ episodeId: 'Episode not found' }),
        HTTP_STATUS.NOT_FOUND
      );
    }

    // 解析请求体
    const body = await request.json();

    // 使用 Zod 验证请求
    const parseResult = UpdateEpisodeRequest.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      return jsonResponse(
        fail({
          title: errors.title?.[0],
          description: errors.description?.[0],
          sortOrder: errors.sortOrder?.[0],
          pubDate: errors.pubDate?.[0],
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const validatedData = parseResult.data;

    // 构建更新对象，只包含实际提供的字段
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.sortOrder !== undefined) {
      updateData.sortOrder = validatedData.sortOrder;
    }
    if (validatedData.pubDate !== undefined) {
      updateData.pubDate = new Date(validatedData.pubDate);
    }

    // 更新剧集
    const updated = await db
      .update(episodes)
      .set(updateData)
      .where(eq(episodes.id, episodeId))
      .returning()
      .get();

    // 清除 Feed 缓存
    clearFeedCache(podcast.id);

    return jsonResponse(
      success(updated),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[PUT /api/v1/podcasts/${username}/${dirName}/episodes/${episodeId}] Error:`, err);
    return jsonResponse(
      error('Failed to update episode', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 删除剧集
 * @description 删除剧集及其相关文件（音频、封面）
 * @pathParams PodcastIdParam
 * @pathParams EpisodeIdParam
 * @response 200 - SuccessResponse(DeleteEpisodeResponse) - 删除成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; dirName: string; episodeId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return jsonResponse(
      error('Unauthorized', HTTP_STATUS.UNAUTHORIZED),
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const { username, dirName, episodeId } = await params;

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

    // 获取剧集信息
    const episode = await db
      .select()
      .from(episodes)
      .where(and(
        eq(episodes.id, episodeId),
        eq(episodes.podcastId, podcast.id)
      ))
      .limit(1)
      .get();

    if (!episode) {
      return jsonResponse(
        fail({ episodeId: 'Episode not found' }),
        HTTP_STATUS.NOT_FOUND
      );
    }

    // 删除音频文件
    const audioPath = join(
      process.cwd(),
      getLocalPath(podcast.userId, podcast.dirName, episode.fileName)
    );

    try {
      await unlink(audioPath);
      console.log(`[DELETE Episode] Deleted audio file: ${audioPath}`);
    } catch (err) {
      console.error('[DELETE Episode] Failed to delete audio file:', err);
      // 文件删除失败不阻塞整个流程
    }

    // 删除剧集封面（如果有）
    if (episode.coverFileName) {
      const coverPath = join(
        process.cwd(),
        getLocalPath(podcast.userId, podcast.dirName, episode.coverFileName)
      );

      try {
        await unlink(coverPath);
        console.log(`[DELETE Episode] Deleted cover file: ${coverPath}`);
      } catch (err) {
        console.error('[DELETE Episode] Failed to delete cover file:', err);
        // 封面删除失败不阻塞整个流程
      }
    }

    // 删除数据库记录
    await db
      .delete(episodes)
      .where(eq(episodes.id, episodeId));

    // 清除 Feed 缓存
    clearFeedCache(podcast.id);

    return jsonResponse(
      success({
        message: 'Episode deleted successfully',
        deletedEpisodeId: episodeId,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[DELETE /api/v1/podcasts/${username}/${dirName}/episodes/${episodeId}] Error:`, err);
    return jsonResponse(
      error('Failed to delete episode', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
