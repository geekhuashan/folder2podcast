/**
 * 剧集服务（函数式）
 *
 * 说明：
 * - 管理剧集的自定义元数据（title, description, pubDate, coverUrl）
 * - 所有操作都包含权限检查
 */

import { db } from '../db';
import { episodes, podcasts } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * 更新剧集元数据
 *
 * @param podcastId - 播客 ID
 * @param fileName - 音频文件名
 * @param userId - 当前用户 ID（用于权限检查）
 * @param metadata - 要更新的元数据
 * @returns 更新后的剧集对象
 *
 * 说明：
 * - 只更新用户自定义的字段（title, description, pubDate, coverUrl, sortOrder）
 * - 文件信息（duration, fileSize）由扫描功能自动更新
 * - sortOrder 变更后，pubDate 会在下次 Feed 生成时自动重新计算
 */
export async function updateEpisodeMetadata(
  podcastId: string,
  fileName: string,
  userId: string,
  metadata: {
    title?: string;
    description?: string;
    pubDate?: string;
    coverUrl?: string;
    sortOrder?: number;
  }
) {
  // 检查播客所有权
  const podcast = await db.select().from(podcasts).where(eq(podcasts.id, podcastId)).get();
  if (!podcast || podcast.userId !== userId) {
    throw new Error('无权限操作此剧集');
  }

  const episodeId = `${podcastId}:${fileName}`;

  // 更新元数据
  const updated = await db
    .update(episodes)
    .set({
      ...metadata,
      pubDate: metadata.pubDate ? new Date(metadata.pubDate) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episodeId))
    .returning()
    .get();

  if (!updated) {
    throw new Error(`剧集 "${fileName}" 不存在`);
  }

  return updated;
}

/**
 * 删除剧集的自定义元数据
 *
 * @param podcastId - 播客 ID
 * @param fileName - 音频文件名
 * @param userId - 当前用户 ID（用于权限检查）
 *
 * 说明：
 * - 将自定义字段重置为 null
 * - 下次扫描时会使用文件的默认信息
 */
export async function deleteEpisodeMetadata(podcastId: string, fileName: string, userId: string) {
  // 检查播客所有权
  const podcast = await db.select().from(podcasts).where(eq(podcasts.id, podcastId)).get();
  if (!podcast || podcast.userId !== userId) {
    throw new Error('无权限操作此剧集');
  }

  const episodeId = `${podcastId}:${fileName}`;

  // 重置自定义元数据
  await db
    .update(episodes)
    .set({
      title: null,
      description: null,
      pubDate: null,
      coverUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episodeId));
}

/**
 * 获取播客的所有剧集
 *
 * @param podcastId - 播客 ID
 * @returns 剧集列表
 */
export async function getPodcastEpisodes(podcastId: string) {
  return await db.select().from(episodes).where(eq(episodes.podcastId, podcastId)).all();
}
