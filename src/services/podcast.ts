/**
 * 播客服务（函数式重构）
 *
 * 说明：
 * - 所有函数都是纯函数或明确的副作用函数
 * - 数据存储从文件系统迁移到 SQLite 数据库
 * - 支持多用户隔离（每个用户独立的播客空间）
 * - 文件系统路径: audio/{userId}/{dirName}/
 */

import fs from "fs-extra";
import path from "path";
import { db } from "../db";
import { podcasts, episodes as episodesTable } from "../db/schema";
import { eq, and } from "drizzle-orm";
import {
  createEpisode,
  validateFileName,
  parseEpisodeNumber,
} from "../utils/episode";
import { getEnvConfig } from "../utils/env";
import { EpisodeMetadata, EpisodesConfig } from "../types";

const AUDIO_DIR = getEnvConfig().AUDIO_DIR;

// ====== 音频元数据提取 ======

/**
 * 提取音频文件的时长
 *
 * @param filePath - 音频文件完整路径
 * @returns 时长（秒），提取失败返回 0
 */
async function extractAudioDuration(filePath: string): Promise<number> {
  try {
    const { parseFile } = await import("music-metadata");
    const metadata = await parseFile(filePath, { duration: true });
    return Math.round(metadata.format.duration || 0);
  } catch (error) {
    console.warn(
      `[extractAudioDuration] 提取失败: ${path.basename(filePath)}`,
      error,
    );
    return 0;
  }
}

// ====== 播客 CRUD 操作 ======

/**
 * 获取用户的所有播客（包含剧集数量）
 *
 * @param userId - 用户 ID
 * @returns 播客列表（包含 episodeCount 字段）
 */
export async function getUserPodcasts(userId: string) {
  const podcastList = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.userId, userId))
    .all();

  // 为每个播客查询剧集数量
  const podcastsWithCount = await Promise.all(
    podcastList.map(async (podcast) => {
      const episodeCount = await db
        .select({ count: episodesTable.id })
        .from(episodesTable)
        .where(eq(episodesTable.podcastId, podcast.id))
        .all();

      return {
        ...podcast,
        episodeCount: episodeCount.length,
      };
    }),
  );

  return podcastsWithCount;
}

/**
 * 获取所有播客（访客模式使用）
 *
 * @returns 所有播客列表（包含 episodeCount 字段）
 *
 * 说明：
 * - 用于访客模式，返回所有用户的播客
 * - 访客可以查看播客列表和订阅 RSS Feed
 * - 但不能编辑、删除或创建播客
 */
export async function getAllPodcasts() {
  const podcastList = await db.select().from(podcasts).all();

  // 为每个播客查询剧集数量
  const podcastsWithCount = await Promise.all(
    podcastList.map(async (podcast) => {
      const episodeCount = await db
        .select({ count: episodesTable.id })
        .from(episodesTable)
        .where(eq(episodesTable.podcastId, podcast.id))
        .all();

      return {
        ...podcast,
        episodeCount: episodeCount.length,
      };
    }),
  );

  return podcastsWithCount;
}

/**
 * 根据ID获取播客
 *
 * @param podcastId - 播客 ID（格式: userId:dirName）
 * @returns 播客对象或null
 */
export async function getPodcastById(podcastId: string) {
  return await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .get();
}

/**
 * 创建新播客
 *
 * @param userId - 用户 ID
 * @param params - 创建参数
 * @returns 创建的播客对象
 *
 * 说明：
 * - 播客 ID 格式: userId:dirName
 * - 文件系统路径: audio/{userId}/{dirName}/
 * - 同时在数据库和文件系统创建记录
 */
export async function createPodcast(
  userId: string,
  params: {
    dirName: string;
    title: string;
    description?: string;
    author?: string;
  },
) {
  const { dirName, title, description, author } = params;
  const podcastId = `${userId}:${dirName}`;

  // 检查是否已存在
  const existing = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .get();
  if (existing) {
    throw new Error(`播客 "${dirName}" 已存在`);
  }

  // 创建目录（用户隔离）
  const podcastPath = path.join(AUDIO_DIR, userId, dirName);
  await fs.ensureDir(podcastPath);

  // 插入数据库
  const podcast = await db
    .insert(podcasts)
    .values({
      id: podcastId,
      userId,
      dirName,
      title,
      description,
      author,
    })
    .returning()
    .get();

  return podcast;
}

/**
 * 更新播客配置
 *
 * @param podcastId - 播客 ID
 * @param userId - 当前用户 ID（用于权限检查）
 * @param updates - 更新的字段
 * @returns 更新后的播客对象
 *
 * 说明：
 * - 自动检查用户权限（只能更新自己的播客）
 */
export async function updatePodcast(
  podcastId: string,
  userId: string,
  updates: Partial<typeof podcasts.$inferInsert>,
) {
  // 检查所有权
  const podcast = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .get();
  if (!podcast || podcast.userId !== userId) {
    throw new Error("无权限操作此播客");
  }

  // 更新数据库
  const updated = await db
    .update(podcasts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(podcasts.id, podcastId))
    .returning()
    .get();

  return updated!;
}

/**
 * 删除播客
 *
 * @param podcastId - 播客 ID
 * @param userId - 当前用户 ID（用于权限检查）
 * @param deleteFiles - 是否删除文件系统的文件（推荐传 true）
 *
 * 说明:
 * - 验证用户权限
 * - 删除数据库记录会级联删除相关剧集记录
 * - deleteFiles=true 时同时删除文件系统的播客目录及所有文件
 */
export async function deletePodcast(
  podcastId: string,
  userId: string,
  deleteFiles = false,
) {
  const podcast = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .get();
  if (!podcast || podcast.userId !== userId) {
    throw new Error("无权限操作此播客");
  }

  // 删除数据库记录（级联删除剧集）
  await db.delete(podcasts).where(eq(podcasts.id, podcastId));

  // 可选：删除文件系统目录
  if (deleteFiles) {
    const podcastPath = path.join(AUDIO_DIR, podcast.userId, podcast.dirName);
    await fs.remove(podcastPath);
  }
}

// ====== 剧集扫描和同步 ======

/**
 * 扫描播客目录，同步剧集到数据库
 *
 * @param podcastId - 播客 ID
 * @returns 剧集列表（包含数据库中的自定义元数据）
 *
 * 说明：
 * - 从文件系统扫描音频文件
 * - 提取文件的基本信息（文件名、大小、时长等）
 * - 与数据库中的自定义元数据合并
 * - 更新或插入剧集记录
 */
export async function scanPodcastEpisodes(podcastId: string) {
  const podcast = await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.id, podcastId))
    .get();
  if (!podcast) {
    throw new Error("播客不存在");
  }

  const podcastPath = path.join(AUDIO_DIR, podcast.userId, podcast.dirName);

  // 📖 读取 episodes.json 配置文件（如果存在）
  const episodesJsonPath = path.join(podcastPath, "episodes.json");
  let episodesMetadata: Record<string, EpisodeMetadata> = {};

  if (await fs.pathExists(episodesJsonPath)) {
    try {
      const content = await fs.readFile(episodesJsonPath, "utf-8");
      const config = JSON.parse(content) as EpisodesConfig;
      episodesMetadata = config.episodes || {};
      console.log(
        `[scanPodcastEpisodes] 读取 episodes.json，找到 ${Object.keys(episodesMetadata).length} 个剧集元数据`,
      );
    } catch (error) {
      console.warn(`[scanPodcastEpisodes] 读取 episodes.json 失败:`, error);
    }
  }

  // 扫描音频文件
  const audioFiles = await scanAudioFiles(podcastPath);

  // 解析剧集信息（传入 episodes.json 中的元数据）
  const episodesList = await Promise.all(
    audioFiles.map(
      (file) =>
        parseEpisodeInfo(
          file,
          podcastPath,
          {
            titleFormat: podcast.titleFormat || "clean",
            episodeNumberStrategy: podcast.episodeNumberStrategy || "prefix",
            useMTime: podcast.useMTime || false,
          },
          episodesMetadata[file.fileName],
        ), // ✅ 传递 episodes.json 中的元数据
    ),
  );

  // 同步到数据库（核心原则：pubDate 一次生成永不自动改变）
  // 先查询所有现有剧集,用于计算 sortOrder
  const existingEpisodes = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.podcastId, podcastId))
    .all();
  const maxSortOrder =
    existingEpisodes.length > 0
      ? Math.max(...existingEpisodes.map((ep) => ep.sortOrder || 0))
      : 0;

  let nextSortOrder = maxSortOrder + 1;

  for (const ep of episodesList) {
    const episodeId = `${podcastId}:${ep.fileName}`;
    const filePath = path.join(podcastPath, ep.fileName);

    // 查询数据库中是否已存在该剧集
    const existing = existingEpisodes.find((e) => e.id === episodeId);

    if (!existing) {
      // ✅ 首次扫描：提取时长并创建完整记录
      console.log(`[scanPodcastEpisodes] 新剧集 ${ep.fileName}，提取时长...`);
      const duration = await extractAudioDuration(filePath);

      await db.insert(episodesTable).values({
        id: episodeId,
        podcastId,
        fileName: ep.fileName,
        title: ep.title,
        description: ep.description,
        pubDate: ep.pubDate, // ⭐ 一次生成，永不自动改变
        coverUrl: ep.coverUrl,
        duration, // ⭐ 使用提取的真实时长
        fileSize: ep.fileSize,
        version: 1, // ⭐ 初始版本号为 1
        sortOrder: nextSortOrder, // ⭐ 自动生成序号
      });
      nextSortOrder++;
    } else {
      // ✅ 已存在：智能判断是否需要提取时长和同步元数据
      let duration = existing.duration;

      if (existing.duration === 0 || existing.duration === null) {
        // 旧数据或缺失时长：自动修复
        console.log(
          `[scanPodcastEpisodes] 修复旧数据 ${ep.fileName}，提取时长...`,
        );
        duration = await extractAudioDuration(filePath);
      }

      // ⭐ 检查 episodes.json 中的元数据是否与数据库不一致，需要同步
      const needsMetadataSync =
        ep.title !== existing.title ||
        ep.description !== existing.description ||
        ep.pubDate?.getTime() !== existing.pubDate?.getTime() ||
        ep.coverUrl !== existing.coverUrl;

      if (needsMetadataSync) {
        console.log(`[scanPodcastEpisodes] 同步元数据: ${ep.fileName}`);
        await db
          .update(episodesTable)
          .set({
            title: ep.title, // ✅ 同步 episodes.json 中的标题
            description: ep.description, // ✅ 同步描述
            pubDate: ep.pubDate, // ✅ 同步发布时间
            coverUrl: ep.coverUrl, // ✅ 同步封面
            duration, // ✅ 使用提取或现有的时长
            fileSize: ep.fileSize,
            updatedAt: new Date(),
          })
          .where(eq(episodesTable.id, episodeId));
      } else {
        // 元数据一致：只更新 fileSize 和 duration（如有需要）
        await db
          .update(episodesTable)
          .set({
            duration,
            fileSize: ep.fileSize,
            updatedAt: new Date(),
          })
          .where(eq(episodesTable.id, episodeId));
      }
    }
  }

  // 返回合并后的剧集列表（从数据库读取）
  const result = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.podcastId, podcastId))
    .all();

  // 排序剧集
  return sortEpisodes(result, {
    episodeNumberStrategy: podcast.episodeNumberStrategy || "prefix",
  });
}

// ====== 辅助函数（纯函数） ======

/**
 * 扫描目录中的音频文件
 *
 * @param dirPath - 目录路径
 * @returns 音频文件信息数组
 *
 * 说明：
 * - 只扫描根目录，不递归子目录
 * - 忽略隐藏文件（以 . 开头）
 * - 只处理音频文件（mp3, m4a, wav 等）
 */
async function scanAudioFiles(
  dirPath: string,
): Promise<Array<{ fileName: string; stat: any }>> {
  const files: Array<{ fileName: string; stat: any }> = [];

  if (!(await fs.pathExists(dirPath))) {
    return files;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // 跳过隐藏文件和目录
    if (entry.name.startsWith(".")) {
      continue;
    }

    // 只处理文件
    if (!entry.isFile()) {
      continue;
    }

    // 验证是否为音频文件
    if (!validateFileName(entry.name)) {
      continue;
    }

    try {
      const filePath = path.join(dirPath, entry.name);
      const stat = await fs.stat(filePath);
      files.push({ fileName: entry.name, stat });
    } catch (error) {
      console.warn(`Skipping invalid file: ${entry.name}`, error);
    }
  }

  return files;
}

/**
 * 解析单个音频文件的剧集信息
 *
 * @param file - 文件信息
 * @param dirPath - 目录路径
 * @param config - 播客配置
 * @param metadata - episodes.json 中的元数据（可选）
 * @returns 剧集信息对象
 *
 * 说明：
 * - 使用 createEpisode 工具函数提取基本信息
 * - 如果提供了 metadata，则优先使用其中的字段
 * - 自动检测文件系统中的封面文件
 * - 返回文件的元数据（文件名、大小、时长、封面等）
 */
async function parseEpisodeInfo(
  file: { fileName: string; stat: any },
  dirPath: string,
  config: {
    titleFormat: string;
    episodeNumberStrategy: string;
    useMTime: boolean;
  },
  metadata?: EpisodeMetadata, // ✅ 添加可选的 metadata 参数
) {
  const episodeConfig = {
    episodeNumberStrategy: config.episodeNumberStrategy,
    useMTime: config.useMTime,
  } as any; // 临时使用 any 避免类型错误

  // 使用现有的 createEpisode 函数（纯函数），传递正确的目录路径
  const episode = createEpisode(file.fileName, dirPath, episodeConfig);

  // ✅ 自动检测封面文件
  let coverUrl = metadata?.image; // 优先使用 episodes.json 中的 image
  if (!coverUrl) {
    // 如果没有配置，尝试自动检测文件系统中的封面
    const { detectEpisodeCover } = await import("../utils/file.utils");
    coverUrl = (await detectEpisodeCover(file.fileName, dirPath)) || undefined;
  }

  return {
    fileName: file.fileName,
    // ✅ 优先使用 episodes.json 中的 title，否则使用从文件名提取的 title
    title: metadata?.title || episode.title,
    // ✅ 使用 episodes.json 中的 description
    description: metadata?.description,
    // ✅ 优先使用 episodes.json 中的 pubDate，否则使用生成的 pubDate
    pubDate: metadata?.pubDate ? new Date(metadata.pubDate) : episode.pubDate,
    duration: 0, // ⭐ 不在这里提取，延迟到数据库同步时按需提取
    fileSize: file.stat.size,
    // ✅ 封面：优先使用 episodes.json，其次自动检测
    coverUrl,
  };
}

/**
 * 排序剧集数组
 *
 * @param episodes - 剧集数组
 * @param config - 播客配置
 * @returns 排序后的剧集数组
 *
 * 说明：
 * - 有序号的剧集按序号升序排列
 * - 无序号的剧集按时间排序
 * - 有序号的排在前面，无序号的排在后面
 */
function sortEpisodes(
  episodes: Array<{
    fileName: string;
    pubDate: Date | null;
    [key: string]: any;
  }>,
  config: { episodeNumberStrategy: string },
) {
  // 缓存序号解析结果
  const numberCache = new Map<string, number | null>();
  episodes.forEach((ep) => {
    numberCache.set(
      ep.fileName,
      parseEpisodeNumber(ep.fileName, {
        episodeNumberStrategy: config.episodeNumberStrategy,
      } as any),
    );
  });

  // 分离有序号和无序号
  const numbered = episodes.filter((e) => numberCache.get(e.fileName) !== null);
  const unnumbered = episodes.filter(
    (e) => numberCache.get(e.fileName) === null,
  );

  // 有序号按序号排序
  numbered.sort((a, b) => {
    const aNum = numberCache.get(a.fileName) || 0;
    const bNum = numberCache.get(b.fileName) || 0;
    return aNum - bNum;
  });

  // 无序号按时间排序
  unnumbered.sort((a, b) => {
    const aTime = a.pubDate ? a.pubDate.getTime() : 0;
    const bTime = b.pubDate ? b.pubDate.getTime() : 0;
    return aTime - bTime;
  });

  // 合并
  return [...numbered, ...unnumbered];
}
