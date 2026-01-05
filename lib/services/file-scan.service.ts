import { db } from '@/lib/db';
import { podcasts, episodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getLocalPath, isEpisodeCover, extractAudioFileNameFromCover } from '@/lib/utils/url';
import { extractMetadataFromFile, isAudioFile } from '@/lib/utils/audio';

/**
 * 文件扫描服务
 * 负责扫描播客目录并同步到数据库
 *
 * 核心功能：
 * - 扫描音频文件并提取元数据
 * - 增量更新数据库（新增、更新、删除）
 * - 关联剧集封面文件
 */

/**
 * 扫描结果类型
 */
export interface ScanResult {
  // 新增的剧集数量
  added: number;
  // 更新的剧集数量
  updated: number;
  // 删除的剧集数量
  deleted: number;
  // 总剧集数量
  total: number;
}

/**
 * 扫描播客目录并同步到数据库
 *
 * @param podcastId - 播客 ID
 * @returns 扫描结果
 *
 * @example
 * ```ts
 * const result = await scanPodcastFiles('podcast-uuid');
 * console.log(`新增 ${result.added} 个剧集`);
 * ```
 *
 * 工作流程：
 * 1. 获取播客信息
 * 2. 扫描文件系统中的音频文件
 * 3. 检测封面文件（播客封面和剧集封面）
 * 4. 对比数据库，执行增删改操作
 * 5. 返回扫描结果
 */
export async function scanPodcastFiles(podcastId: string): Promise<ScanResult> {
  // 1. 获取播客信息
  const podcast = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .limit(1)
    .get();

  if (!podcast) {
    throw new Error(`Podcast not found: ${podcastId}`);
  }

  const podcastDir = getLocalPath(podcast.userId, podcast.dirName);

  // 2. 扫描文件系统中的音频文件和封面文件
  const { audioFiles, coverMap } = await scanDirectory(podcastDir);

  // 3. 获取数据库中现有的剧集
  const existingEpisodes = await db
    .select()
    .from(episodes)
    .where(eq(episodes.podcastId, podcastId))
    .all();

  const existingFileNames = new Set(existingEpisodes.map(ep => ep.fileName));
  const currentFileNames = new Set(audioFiles.map(f => f.fileName));

  let added = 0;
  let updated = 0;
  let deleted = 0;

  // 4. 处理每个音频文件
  for (const audioFile of audioFiles) {
    const existing = existingEpisodes.find(ep => ep.fileName === audioFile.fileName);

    if (!existing) {
      // 新文件：创建剧集记录
      try {
        await createEpisode(podcastId, podcast.userId, podcast.dirName, audioFile, coverMap);
        added++;
        console.log(`[scanPodcastFiles] 新增剧集: ${audioFile.fileName}`);
      } catch (error) {
        console.error(`[scanPodcastFiles] 创建剧集失败: ${audioFile.fileName}`, error);
      }
    } else {
      // 已存在文件：检查是否需要更新
      const needsUpdate =
        audioFile.fileSize !== existing.fileSize ||
        audioFile.coverFileName !== existing.coverFileName;

      if (needsUpdate) {
        try {
          await updateEpisode(existing.id, audioFile, coverMap);
          updated++;
          console.log(`[scanPodcastFiles] 更新剧集: ${audioFile.fileName}`);
        } catch (error) {
          console.error(`[scanPodcastFiles] 更新剧集失败: ${audioFile.fileName}`, error);
        }
      }
    }
  }

  // 5. 删除数据库中但文件系统中已不存在的剧集
  for (const existing of existingEpisodes) {
    if (!currentFileNames.has(existing.fileName)) {
      try {
        await db.delete(episodes).where(eq(episodes.id, existing.id));
        deleted++;
        console.log(`[scanPodcastFiles] 删除剧集: ${existing.fileName}`);
      } catch (error) {
        console.error(`[scanPodcastFiles] 删除剧集失败: ${existing.fileName}`, error);
      }
    }
  }

  // 6. 返回扫描结果
  const total = await db
    .select({ count: episodes.id })
    .from(episodes)
    .where(eq(episodes.podcastId, podcastId))
    .all();

  return {
    added,
    updated,
    deleted,
    total: total.length,
  };
}

/**
 * 扫描目录中的音频文件和封面文件
 */
interface AudioFileInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
  pubDate: Date;
  coverFileName?: string;
}

interface ScanDirectoryResult {
  audioFiles: AudioFileInfo[];
  coverMap: Map<string, string>; // fileName -> coverFileName
}

async function scanDirectory(dir: string): Promise<ScanDirectoryResult> {
  const audioFiles: AudioFileInfo[] = [];
  const coverMap = new Map<string, string>();
  const episodeCovers: { coverFile: string; audioBaseName: string }[] = [];

  try {
    const files = await readdir(dir);

    for (const file of files) {
      const filePath = join(dir, file);
      const stats = await stat(filePath);

      // 跳过目录
      if (stats.isDirectory()) {
        continue;
      }

      // 音频文件
      if (isAudioFile(file)) {
        audioFiles.push({
          fileName: file,
          filePath,
          fileSize: stats.size,
          pubDate: stats.mtime,
        });
      }

      // 剧集封面文件（ep-*.jpg）
      if (isEpisodeCover(file)) {
        const audioBaseName = extractAudioFileNameFromCover(file);
        if (audioBaseName) {
          episodeCovers.push({ coverFile: file, audioBaseName });
        }
      }
    }

    // 关联剧集封面到音频文件
    for (const { coverFile, audioBaseName } of episodeCovers) {
      // 查找匹配的音频文件（不考虑扩展名）
      const matchedAudio = audioFiles.find(audio => {
        const audioBaseName = basename(audio.fileName, extname(audio.fileName));
        return audioBaseName === audioBaseName;
      });

      if (matchedAudio) {
        coverMap.set(matchedAudio.fileName, coverFile);
      }
    }

    return { audioFiles, coverMap };
  } catch (error) {
    console.error(`[scanDirectory] 扫描目录失败: ${dir}`, error);
    return { audioFiles: [], coverMap: new Map() };
  }
}

/**
 * 创建新的剧集记录
 */
async function createEpisode(
  podcastId: string,
  userId: string,
  podcastDir: string,
  audioFile: AudioFileInfo,
  coverMap: Map<string, string>
): Promise<void> {
  // 提取音频元数据
  const metadata = await extractMetadataFromFile(audioFile.filePath);

  // 生成剧集标题（优先使用元数据中的标题，否则使用文件名）
  const title = metadata.title || basename(audioFile.fileName, extname(audioFile.fileName));

  // 获取封面文件名
  const coverFileName = coverMap.get(audioFile.fileName);

  // 插入数据库
  await db.insert(episodes).values({
    id: uuidv4(),
    podcastId,
    fileName: audioFile.fileName,
    fileSize: audioFile.fileSize,
    title,
    description: metadata.artist || metadata.album || null,
    pubDate: audioFile.pubDate,
    duration: metadata.duration,
    coverFileName: coverFileName || null,
  });
}

/**
 * 更新已存在的剧集记录
 */
async function updateEpisode(
  episodeId: string,
  audioFile: AudioFileInfo,
  coverMap: Map<string, string>
): Promise<void> {
  // 重新提取音频元数据
  const metadata = await extractMetadataFromFile(audioFile.filePath);

  // 获取封面文件名
  const coverFileName = coverMap.get(audioFile.fileName);

  // 更新数据库
  await db
    .update(episodes)
    .set({
      fileSize: audioFile.fileSize,
      duration: metadata.duration,
      coverFileName: coverFileName || null,
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episodeId));
}
