/**
 * 播客封面管理 API
 * POST /api/v1/podcasts/[username]/[dirName]/cover - 上传播客封面
 * DELETE /api/v1/podcasts/[username]/[dirName]/cover - 删除播客封面
 */

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { getLocalPath, getPodcastCoverUrl } from '@/lib/utils/url';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { copyDefaultCoverToPodcast, copyPodcastCoverToEpisode } from '@/lib/utils/cover';
import { db } from '@/lib/db';
import { episodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 上传播客封面
 * @description 为播客上传封面图片（支持 JPEG、PNG、WebP，最大 10MB）
 * @request multipart/form-data
 * @response 200 - SuccessResponse - 上传成功
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

    // 播客封面固定文件名：cover.{ext}
    const coverFileName = `cover.${ext}`;

    // 如果已有旧封面（不同扩展名），先删除
    const possibleExts = ['jpg', 'png', 'webp'];
    for (const oldExt of possibleExts) {
      if (oldExt === ext) continue; // 跳过当前扩展名（会被覆盖）
      const oldCoverPath = join(
        process.cwd(),
        getLocalPath(podcast.userId, podcast.dirName, `cover.${oldExt}`)
      );
      try {
        await unlink(oldCoverPath);
        console.log(`[POST Podcast Cover] Deleted old cover: ${oldCoverPath}`);
      } catch (err) {
        // 文件不存在或删除失败，忽略
      }
    }

    // 保存文件
    const coverPath = join(
      process.cwd(),
      getLocalPath(podcast.userId, podcast.dirName, coverFileName)
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(coverPath, buffer);

    console.log(`[POST Podcast Cover] Saved cover: ${coverPath}`);

    // 如果启用继承，批量更新所有剧集封面
    if (podcast.inheritanceEnabled) {
      try {
        const allEpisodes = await db.select()
          .from(episodes)
          .where(eq(episodes.podcastId, podcast.id))
          .all();

        for (const ep of allEpisodes) {
          // 用新的播客封面覆盖剧集封面
          await copyPodcastCoverToEpisode(podcast.userId, podcast.dirName, ep.id);
        }

        console.log(`[POST Podcast Cover] Updated ${allEpisodes.length} episode covers`);
      } catch (err) {
        console.error('[POST Podcast Cover] Failed to update episode covers:', err);
        // 不阻塞主流程
      }
    }

    // 清除 Feed 缓存
    clearFeedCache(podcast.id);

    return jsonResponse(
      success({
        message: 'Cover uploaded successfully',
        coverUrl: getPodcastCoverUrl(podcast.userId, podcast.dirName),
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[POST /api/v1/podcasts/${username}/${dirName}/cover] Error:`, err);
    return jsonResponse(
      error('Failed to upload cover', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 删除播客封面
 * @description 删除播客的封面图片
 * @response 200 - SuccessResponse - 删除成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function DELETE(
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

    // 删除所有可能的封面文件
    const possibleExts = ['jpg', 'png', 'webp'];
    let deleted = false;

    for (const ext of possibleExts) {
      const coverPath = join(
        process.cwd(),
        getLocalPath(podcast.userId, podcast.dirName, `cover.${ext}`)
      );

      try {
        await unlink(coverPath);
        console.log(`[DELETE Podcast Cover] Deleted cover: ${coverPath}`);
        deleted = true;
      } catch (err) {
        // 文件不存在，继续尝试其他扩展名
      }
    }

    // 还原为默认封面
    try {
      await copyDefaultCoverToPodcast(podcast.userId, podcast.dirName);
      console.log(`[DELETE Podcast Cover] Restored default cover for ${podcast.dirName}`);
    } catch (err) {
      console.error('[DELETE Podcast Cover] Failed to restore default cover:', err);
      return jsonResponse(
        error('Failed to restore default cover', HTTP_STATUS.INTERNAL_SERVER_ERROR),
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // 如果启用继承，批量更新所有剧集封面
    if (podcast.inheritanceEnabled) {
      try {
        const allEpisodes = await db.select()
          .from(episodes)
          .where(eq(episodes.podcastId, podcast.id))
          .all();

        for (const ep of allEpisodes) {
          // 用新的默认封面覆盖剧集封面
          await copyPodcastCoverToEpisode(podcast.userId, podcast.dirName, ep.id);
        }

        console.log(`[DELETE Podcast Cover] Updated ${allEpisodes.length} episode covers`);
      } catch (err) {
        console.error('[DELETE Podcast Cover] Failed to update episode covers:', err);
        // 不阻塞主流程
      }
    }

    // 清除 Feed 缓存
    clearFeedCache(podcast.id);

    return jsonResponse(
      success({
        message: 'Cover deleted and restored to default',
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[DELETE /api/v1/podcasts/${username}/${dirName}/cover] Error:`, err);
    return jsonResponse(
      error('Failed to delete cover', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
