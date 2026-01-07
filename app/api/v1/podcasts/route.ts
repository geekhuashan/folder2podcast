import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { podcasts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { createApiLogger } from '@/lib/middleware/logger';
import { getRssFeedUrl, getPodcastCoverUrl } from '@/lib/utils/url';
import { getUserById } from '@/lib/db/queries';
import { mkdir } from 'fs/promises';
import { getLocalPath } from '@/lib/utils/url';
import { CreatePodcastRequest, PodcastWithFeedUrl } from '@/lib/schemas/podcast';
import { z } from 'zod';

// 导出 schemas 供 OpenAPI 生成器使用
export { CreatePodcastRequest, PodcastWithFeedUrl };

// 播客列表响应
const PodcastListResponse = z.array(PodcastWithFeedUrl);
export { PodcastListResponse };

/**
 * 获取播客列表
 * @description 获取当前用户的所有播客
 * @response 200 - SuccessResponse(PodcastListResponse) - 成功返回播客列表
 * @security AccessKeyAuth
 * @openapi
 */
export async function GET(request: NextRequest) {
  const logger = createApiLogger(request);

  // 1. 验证 Access Key
  const auth = await authenticateRequest(request);
  if (!auth) {
    logger.logWarning(HTTP_STATUS.UNAUTHORIZED, 'Invalid or missing access key');
    return jsonResponse(error('Unauthorized', HTTP_STATUS.UNAUTHORIZED), HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    // 2. 查询当前用户的播客列表
    const podcastsList = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.userId, auth.userId))
      .all();

    // 3. 获取用户名
    const user = await getUserById(auth.userId);
    if (!user) {
      logger.logWarning(HTTP_STATUS.NOT_FOUND, 'User not found');
      return jsonResponse(error('User not found', HTTP_STATUS.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    // 4. 为每个播客添加 RSS Feed URL、username 和 imageUrl
    const podcastsWithUrl = podcastsList.map(podcast => ({
      ...podcast,
      username: user.username,
      imageUrl: getPodcastCoverUrl(podcast.userId, podcast.dirName),
      feedUrl: getRssFeedUrl(user.username, podcast.dirName),
    }));

    // 5. 返回成功响应
    logger.logSuccess(HTTP_STATUS.OK, `Found ${podcastsWithUrl.length} podcasts`);
    return jsonResponse(success(podcastsWithUrl), HTTP_STATUS.OK);
  } catch (err) {
    logger.logError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch podcasts', err);
    return jsonResponse(
      error('Failed to fetch podcasts', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 创建播客
 * @description 创建新的播客频道
 * @request CreatePodcastRequest
 * @response 201 - SuccessResponse(PodcastWithFeedUrl) - 创建成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function POST(request: NextRequest) {
  const logger = createApiLogger(request);

  // 1. 验证 Access Key
  const auth = await authenticateRequest(request);
  if (!auth) {
    logger.logWarning(HTTP_STATUS.UNAUTHORIZED, 'Invalid or missing access key');
    return jsonResponse(error('Unauthorized', HTTP_STATUS.UNAUTHORIZED), HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    // 2. 解析请求体
    const body = await request.json();

    // 3. 使用 Zod 验证请求
    const parseResult = CreatePodcastRequest.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      logger.logWarning(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
      return jsonResponse(
        fail({
          dirName: errors.dirName?.[0],
          title: errors.title?.[0],
          description: errors.description?.[0],
          author: errors.author?.[0],
          email: errors.email?.[0],
          websiteUrl: errors.websiteUrl?.[0],
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const validatedData = parseResult.data;

    // 4. 检查 dirName 是否已存在
    const existing = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.dirName, validatedData.dirName))
      .limit(1)
      .get();

    if (existing) {
      logger.logWarning(HTTP_STATUS.CONFLICT, `Directory name already exists: ${validatedData.dirName}`);
      return jsonResponse(
        fail({
          dirName: 'Directory name already exists',
        }),
        HTTP_STATUS.CONFLICT
      );
    }

    // 5. 创建播客目录
    const podcastDir = getLocalPath(auth.userId, validatedData.dirName);
    try {
      await mkdir(podcastDir, { recursive: true });
    } catch (err) {
      logger.logError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create directory', err);
      return jsonResponse(
        error('Failed to create podcast directory', HTTP_STATUS.INTERNAL_SERVER_ERROR),
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // 6. 插入数据库
    const podcastId = uuidv4();
    const newPodcast = await db
      .insert(podcasts)
      .values({
        id: podcastId,
        userId: auth.userId,
        ...validatedData,
      })
      .returning()
      .get();

    // 7. 获取用户名以生成 Feed URL
    const user = await getUserById(auth.userId);
    if (!user) {
      logger.logWarning(HTTP_STATUS.NOT_FOUND, 'User not found');
      return jsonResponse(error('User not found', HTTP_STATUS.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    // 8. 返回成功响应
    logger.logSuccess(HTTP_STATUS.CREATED, `Podcast created: ${newPodcast.dirName} (${newPodcast.id})`);
    return jsonResponse(
      success({
        ...newPodcast,
        username: user.username,
        imageUrl: getPodcastCoverUrl(newPodcast.userId, newPodcast.dirName),
        feedUrl: getRssFeedUrl(user.username, newPodcast.dirName),
      }),
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    logger.logError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create podcast', err);
    return jsonResponse(
      error('Failed to create podcast', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
