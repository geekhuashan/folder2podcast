/**
 * 剧集封面管理 API
 * POST /api/v1/podcasts/[id]/episodes/[episodeId]/cover - 上传剧集封面
 * DELETE /api/v1/podcasts/[id]/episodes/[episodeId]/cover - 删除剧集封面
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { episodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { getLocalPath, getEpisodeCoverUrl } from '@/lib/utils/url';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import {
  PodcastIdParam,
  EpisodeIdParam,
  UploadEpisodeCoverResponse,
  DeleteEpisodeCoverResponse,
} from '@/lib/schemas/podcast';

// 导出 schemas 供 OpenAPI 生成器使用
export { PodcastIdParam, EpisodeIdParam, UploadEpisodeCoverResponse, DeleteEpisodeCoverResponse };

/**
 * 上传剧集封面
 * @description 为剧集上传封面图片（支持 JPEG、PNG、WebP，最大 10MB）
 * @pathParams PodcastIdParam
 * @pathParams EpisodeIdParam
 * @request multipart/form-data
 * @response 200 - SuccessResponse(UploadEpisodeCoverResponse) - 上传成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function POST(
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

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return jsonResponse(
        fail({ file: 'No file provided' }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse(
        fail({ file: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse(
        fail({ file: 'File size exceeds 10MB limit' }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 确定文件扩展名
    const ext = file.type === 'image/jpeg' ? 'jpg'
              : file.type === 'image/png' ? 'png'
              : 'webp';

    // 生成封面文件名：ep-{episodeId}.{ext}
    const coverFileName = `ep-${episodeId}.${ext}`;

    // 如果已有旧封面，先删除
    if (episode.coverFileName) {
      const oldCoverPath = join(
        process.cwd(),
        getLocalPath(podcast.userId, podcast.dirName, episode.coverFileName)
      );
      try {
        await unlink(oldCoverPath);
        console.log(`[POST Cover] Deleted old cover: ${oldCoverPath}`);
      } catch (err) {
        console.error('[POST Cover] Failed to delete old cover:', err);
      }
    }

    // 保存文件
    const coverPath = join(
      process.cwd(),
      getLocalPath(podcast.userId, podcast.dirName, coverFileName)
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(coverPath, buffer);

    console.log(`[POST Cover] Saved cover: ${coverPath}`);

    // 更新数据库
    await db
      .update(episodes)
      .set({
        coverFileName,
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId));

    // 清除 Feed 缓存
    clearFeedCache(podcast.id);

    return jsonResponse(
      success({
        message: 'Cover uploaded successfully',
        coverUrl: getEpisodeCoverUrl(podcast.userId, podcast.dirName, coverFileName),
        coverFileName,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[POST /api/v1/podcasts/${username}/${dirName}/episodes/${episodeId}/cover] Error:`, err);
    return jsonResponse(
      error('Failed to upload cover', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 删除剧集封面
 * @description 删除剧集的封面图片
 * @pathParams PodcastIdParam
 * @pathParams EpisodeIdParam
 * @response 200 - SuccessResponse(DeleteEpisodeCoverResponse) - 删除成功
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

    if (!episode.coverFileName) {
      return jsonResponse(
        fail({ cover: 'Episode has no cover to delete' }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 删除封面文件
    const coverPath = join(
      process.cwd(),
      getLocalPath(podcast.userId, podcast.dirName, episode.coverFileName)
    );

    try {
      await unlink(coverPath);
      console.log(`[DELETE Cover] Deleted cover: ${coverPath}`);
    } catch (err) {
      console.error('[DELETE Cover] Failed to delete cover file:', err);
      // 文件删除失败不阻塞整个流程
    }

    // 更新数据库（移除封面引用）
    await db
      .update(episodes)
      .set({
        coverFileName: null,
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId));

    // 清除 Feed 缓存
    clearFeedCache(podcast.id);

    return jsonResponse(
      success({
        message: 'Cover deleted successfully',
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[DELETE /api/v1/podcasts/${username}/${dirName}/episodes/${episodeId}/cover] Error:`, err);
    return jsonResponse(
      error('Failed to delete cover', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
