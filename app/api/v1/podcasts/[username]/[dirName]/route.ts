import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { podcasts, episodes as episodesTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { getRssFeedUrl } from '@/lib/utils/url';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { rm, rename } from 'fs/promises';
import { getLocalPath } from '@/lib/utils/url';
import { join } from 'path';
import { getPodcastByUserAndDir, getUserByUsername } from '@/lib/db/queries';
import {
  UpdatePodcastRequest,
  PodcastDetailResponse,
  PodcastWithFeedUrl,
  DeletePodcastResponse,
} from '@/lib/schemas/podcast';

// 导出 schemas 供 OpenAPI 生成器使用
export { UpdatePodcastRequest, PodcastDetailResponse, DeletePodcastResponse };

/**
 * 获取播客详情
 * @description 获取指定播客的详细信息，包括剧集数量
 * @response 200 - SuccessResponse(PodcastDetailResponse) - 成功返回播客详情
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

    // 获取剧集数量
    const episodeCount = await db
      .select({ count: episodesTable.id })
      .from(episodesTable)
      .where(eq(episodesTable.podcastId, podcast.id))
      .all();

    return jsonResponse(
      success({
        ...podcast,
        feedUrl: getRssFeedUrl(username, podcast.dirName),
        episodeCount: episodeCount.length,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error('[GET /api/v1/podcasts/[username]/[dirName]] Error:', err);
    return jsonResponse(
      error('Failed to fetch podcast', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 更新播客元数据
 * @description 更新播客的标题、描述、dirName 等信息
 * @request UpdatePodcastRequest
 * @response 200 - SuccessResponse(PodcastWithFeedUrl) - 更新成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function PUT(
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
    // 查询播客
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
    const parseResult = UpdatePodcastRequest.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      return jsonResponse(
        fail({
          title: errors.title?.[0],
          description: errors.description?.[0],
          author: errors.author?.[0],
          email: errors.email?.[0],
          websiteUrl: errors.websiteUrl?.[0],
          language: errors.language?.[0],
          category: errors.category?.[0],
          explicit: errors.explicit?.[0],
          dirName: errors.dirName?.[0],
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const validatedData = parseResult.data;

    // 检测 dirName 是否被修改
    const dirNameChanged = validatedData.dirName && validatedData.dirName !== podcast.dirName;
    const oldDirName = podcast.dirName;

    // 如果 dirName 被修改，检查唯一性（用户级别）
    if (dirNameChanged) {
      const existingPodcast = await getPodcastByUserAndDir(auth.userId, validatedData.dirName!);

      if (existingPodcast) {
        return jsonResponse(
          fail({ dirName: 'Directory name already exists for this user' }),
          HTTP_STATUS.CONFLICT
        );
      }
    }

    // 更新数据库
    const updated = await db
      .update(podcasts)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(podcasts.id, podcast.id))
      .returning()
      .get();

    // 清除 Feed 缓存（任何更新都需要清除缓存）
    clearFeedCache(podcast.id);

    // 如果 dirName 被修改，重命名文件系统目录
    if (dirNameChanged) {
      const oldPath = join(process.cwd(), getLocalPath(podcast.userId, oldDirName));
      const newPath = join(process.cwd(), getLocalPath(podcast.userId, validatedData.dirName!));

      try {
        // 使用 fs.rename 原子性重命名目录
        await rename(oldPath, newPath);
        console.log(`[PUT /api/v1/podcasts/${username}/${dirName}] Renamed directory: ${oldPath} -> ${newPath}`);
      } catch (renameError) {
        console.error(`[PUT /api/v1/podcasts/${username}/${dirName}] Directory rename failed:`, renameError);

        // 回滚数据库更改
        try {
          await db
            .update(podcasts)
            .set({ dirName: oldDirName, updatedAt: new Date() })
            .where(eq(podcasts.id, podcast.id));

          console.log(`[PUT /api/v1/podcasts/${username}/${dirName}] Database rolled back to dirName: ${oldDirName}`);
        } catch (rollbackError) {
          console.error(`[PUT /api/v1/podcasts/${username}/${dirName}] Rollback failed:`, rollbackError);
        }

        return jsonResponse(
          error('Failed to rename directory', HTTP_STATUS.INTERNAL_SERVER_ERROR),
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    }

    return jsonResponse(
      success({
        ...updated,
        feedUrl: getRssFeedUrl(username, updated.dirName),
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[PUT /api/v1/podcasts/${username}/${dirName}] Error:`, err);
    return jsonResponse(
      error('Failed to update podcast', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 删除播客
 * @description 删除播客及其所有剧集（可选删除文件）
 * @query deleteFiles - 是否删除文件系统中的文件（默认 false）
 * @response 200 - SuccessResponse(DeletePodcastResponse) - 删除成功
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
    // 查询播客
    const podcast = await getPodcastByUserAndDir(user.id, dirName);

    if (!podcast) {
      return jsonResponse(
        fail({ podcast: 'Podcast not found' }),
        HTTP_STATUS.NOT_FOUND
      );
    }

    // 检查是否需要删除文件
    const { searchParams } = new URL(request.url);
    const deleteFiles = searchParams.get('deleteFiles') === 'true';

    // 删除数据库记录（级联删除剧集）
    await db.delete(podcasts).where(eq(podcasts.id, podcast.id));

    // 可选：删除文件系统目录
    if (deleteFiles) {
      const podcastDir = join(process.cwd(), getLocalPath(podcast.userId, podcast.dirName));
      try {
        await rm(podcastDir, { recursive: true, force: true });
        console.log(`[DELETE /api/v1/podcasts/${username}/${dirName}] Directory deleted: ${podcastDir}`);
      } catch (err) {
        console.error(`[DELETE /api/v1/podcasts/${username}/${dirName}] Failed to delete directory:`, err);
        // 目录删除失败不影响数据库删除结果
      }
    }

    return jsonResponse(
      success({
        message: 'Podcast deleted successfully',
        filesDeleted: deleteFiles,
      }),
      HTTP_STATUS.OK
    );
  } catch (err) {
    console.error(`[DELETE /api/v1/podcasts/${username}/${dirName}] Error:`, err);
    return jsonResponse(
      error('Failed to delete podcast', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
