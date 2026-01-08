import { copyFile, stat } from 'fs/promises';
import { join } from 'path';
import { getLocalPath } from './url';

/**
 * 复制默认封面到播客目录
 * @param userId 用户 ID
 * @param podcastDir 播客目录名
 * @returns 封面文件名 ('cover.jpg')
 */
export async function copyDefaultCoverToPodcast(
  userId: string,
  podcastDir: string
): Promise<string> {
  const defaultCoverPath = join(process.cwd(), 'public', 'default-podcast-cover.svg');
  const targetCoverPath = join(
    process.cwd(),
    getLocalPath(userId, podcastDir, 'cover.jpg')
  );

  await copyFile(defaultCoverPath, targetCoverPath);
  console.log(`[copyDefaultCover] Copied default cover to ${targetCoverPath}`);
  return 'cover.jpg';
}

/**
 * 复制播客封面为剧集封面
 * @param userId 用户 ID
 * @param podcastDir 播客目录名
 * @param episodeId 剧集 ID
 * @returns 剧集封面文件名 ('ep-{episodeId}.jpg')
 */
export async function copyPodcastCoverToEpisode(
  userId: string,
  podcastDir: string,
  episodeId: string
): Promise<string> {
  const podcastCoverPath = join(
    process.cwd(),
    getLocalPath(userId, podcastDir, 'cover.jpg')
  );
  const episodeCoverPath = join(
    process.cwd(),
    getLocalPath(userId, podcastDir, `ep-${episodeId}.jpg`)
  );

  await copyFile(podcastCoverPath, episodeCoverPath);
  console.log(`[copyEpisodeCover] Copied podcast cover to ${episodeCoverPath}`);
  return `ep-${episodeId}.jpg`;
}

/**
 * 检查播客目录是否有封面文件
 * @param userId 用户 ID
 * @param podcastDir 播客目录名
 * @returns 如果有封面返回 true，否则返回 false
 */
export async function hasPodcastCover(
  userId: string,
  podcastDir: string
): Promise<boolean> {
  const coverPath = join(
    process.cwd(),
    getLocalPath(userId, podcastDir, 'cover.jpg')
  );

  try {
    await stat(coverPath);
    return true;
  } catch {
    return false;
  }
}
