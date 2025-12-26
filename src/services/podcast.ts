/**
 * 播客服务（函数式重构）
 *
 * 说明：
 * - 所有函数都是纯函数或明确的副作用函数
 * - 数据存储从文件系统迁移到 SQLite 数据库
 * - 支持多用户隔离（每个用户独立的播客空间）
 * - 文件系统路径: audio/{userId}/{dirName}/
 */

import path from "path";
import { db } from "../db";
import { podcasts, episodes as episodesTable } from "../db/schema";
import { eq, and } from "drizzle-orm";
import {
  createEpisode,
  validateFileName,
  parseEpisodeNumber,
} from "../utils/episode";
import { getStorage } from "./storage";
import type { IStorage } from "./storage";
import { EpisodeMetadata, EpisodesConfig } from "../types";

// ====== 音频元数据提取 ======

/**
 * 提取音频文件的时长
 *
 * @param storage - 存储实例
 * @param relativePath - 音频文件相对路径
 * @returns 时长（秒），提取失败返回 0
 *
 * 说明：
 * - 本地模式：直接读取文件
 * - S3 模式：下载到临时目录再提取
 */
async function extractAudioDuration(storage: IStorage, relativePath: string): Promise<number> {
  try {
    const { parseBuffer } = await import("music-metadata");

    // 读取文件内容
    const fileBuffer = await storage.readFile(relativePath);

    // 从 Buffer 解析元数据
    const metadata = await parseBuffer(fileBuffer, { mimeType: getMimeType(relativePath) }, { duration: true });
    return Math.round(metadata.format.duration || 0);
  } catch (error) {
    console.warn(
      `[extractAudioDuration] 提取失败: ${path.basename(relativePath)}`,
      error,
    );
    return 0;
  }
}

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
  };
  return mimeTypes[ext] || 'audio/mpeg';
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
  const storage = getStorage();
  const podcastPath = `audio/${userId}/${dirName}`;
  await storage.ensureDirectory(podcastPath);

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
    const storage = getStorage();
    const podcastPath = `audio/${podcast.userId}/${podcast.dirName}`;
    await storage.deleteDirectory(podcastPath);
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

  const storage = getStorage();
  const podcastPath = `audio/${podcast.userId}/${podcast.dirName}`;

  // 📖 读取 episodes.json 配置文件（如果存在）
  const episodesJsonPath = `${podcastPath}/episodes.json`;
  let episodesMetadata: Record<string, EpisodeMetadata> = {};

  if (await storage.fileExists(episodesJsonPath)) {
    try {
      const content = await storage.readFile(episodesJsonPath);
      const config = JSON.parse(content.toString('utf-8')) as EpisodesConfig;
      episodesMetadata = config.episodes || {};
      console.log(
        `[scanPodcastEpisodes] 读取 episodes.json，找到 ${Object.keys(episodesMetadata).length} 个剧集元数据`,
      );
    } catch (error) {
      console.warn(`[scanPodcastEpisodes] 读取 episodes.json 失败:`, error);
    }
  }

  // 扫描音频文件
  const audioFiles = await scanAudioFiles(storage, podcastPath);

  // 解析剧集信息（传入 episodes.json 中的元数据）
  const episodesList = await Promise.all(
    audioFiles.map(
      (file) =>
        parseEpisodeInfo(
          file,
          storage,
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
    const fileRelativePath = `${podcastPath}/${ep.fileName}`;

    // 查询数据库中是否已存在该剧集
    const existing = existingEpisodes.find((e) => e.id === episodeId);

    if (!existing) {
      // ✅ 首次扫描：提取时长并创建完整记录
      console.log(`[scanPodcastEpisodes] 新剧集 ${ep.fileName}，提取时长...`);
      const duration = await extractAudioDuration(storage, fileRelativePath);

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
        duration = await extractAudioDuration(storage, fileRelativePath);
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
 * @param storage - 存储实例
 * @param dirPath - 目录相对路径
 * @returns 音频文件信息数组
 *
 * 说明：
 * - 只扫描根目录，不递归子目录
 * - 忽略隐藏文件（以 . 开头）
 * - 只处理音频文件（mp3, m4a, wav 等）
 */
async function scanAudioFiles(
  storage: IStorage,
  dirPath: string,
): Promise<Array<{ fileName: string; stat: any }>> {
  const files: Array<{ fileName: string; stat: any }> = [];

  if (!(await storage.directoryExists(dirPath))) {
    return files;
  }

  const entries = await storage.listFiles(dirPath, { recursive: false });

  for (const fileName of entries) {
    // 跳过隐藏文件
    if (fileName.startsWith(".")) {
      continue;
    }

    // 验证是否为音频文件
    if (!validateFileName(fileName)) {
      continue;
    }

    try {
      const fileRelativePath = `${dirPath}/${fileName}`;
      const stat = await storage.getFileStats(fileRelativePath);
      files.push({ fileName, stat });
    } catch (error) {
      console.warn(`Skipping invalid file: ${fileName}`, error);
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
  storage: IStorage,
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

  // 使用现有的 createEpisode 函数（纯函数），传递文件统计信息
  const episode = createEpisode(file.fileName, file.stat, episodeConfig);

  // ✅ 自动检测封面文件
  let coverUrl = metadata?.image; // 优先使用 episodes.json 中的 image
  if (!coverUrl) {
    // 如果没有配置，尝试自动检测文件系统中的封面
    const { detectEpisodeCover } = await import("../utils/file.utils");
    coverUrl = (await detectEpisodeCover(storage, file.fileName, dirPath)) || undefined;
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

/**
 * 获取播客的下一个排序号
 *
 * @param podcastId - 播客ID
 * @returns 下一个排序号
 *
 * 说明：
 * - 用于文件上传时自动分配 sortOrder
 * - 确保新添加的剧集排在最后
 */
export async function getNextSortOrder(podcastId: string): Promise<number> {
  const existingEpisodes = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.podcastId, podcastId))
    .all();

  if (existingEpisodes.length === 0) {
    return 1;
  }

  const maxSortOrder = Math.max(...existingEpisodes.map((ep) => ep.sortOrder || 0));
  return maxSortOrder + 1;
}

/**
 * 文件上传时插入数据库记录
 *
 * @param params - 插入参数
 * @returns 插入的剧集记录
 *
 * 说明：
 * - 统一的数据库插入逻辑
 * - 自动提取音频时长
 * - 分配排序号
 * - 本地和S3模式共用
 */
export async function insertEpisodeOnFileUpload(params: {
  podcastId: string;
  fileName: string;
  fileSize: number;
  title?: string;
  description?: string | null;
  pubDate?: Date;
  coverUrl?: string | null;
  duration?: number;
}): Promise<{ id: string; sortOrder: number }> {
  const {
    podcastId,
    fileName,
    fileSize,
    title,
    description,
    pubDate,
    coverUrl,
    duration,
  } = params;

  const episodeId = `${podcastId}:${fileName}`;
  const storage = getStorage();
  const filePath = `audio/${podcastId.split(':')[0]}/${podcastId.split(':')[1]}/${fileName}`;

  // 提取音频时长（如果未提供）
  let extractedDuration = duration;
  if (extractedDuration === undefined || extractedDuration === null) {
    try {
      extractedDuration = await extractAudioDuration(storage, filePath);
    } catch (error) {
      console.warn(`[insertEpisodeOnFileUpload] 提取时长失败: ${fileName}`, error);
      extractedDuration = 0;
    }
  }

  // 获取下一个排序号
  const sortOrder = await getNextSortOrder(podcastId);

  // 生成标题（如果未提供）
  const episodeTitle = title || fileName;

  // 生成发布时间（如果未提供）
  const episodePubDate = pubDate || new Date();

  // 插入数据库
  await db
    .insert(episodesTable)
    .values({
      id: episodeId,
      podcastId,
      fileName,
      title: episodeTitle,
      description: description || null,
      pubDate: episodePubDate,
      coverUrl: coverUrl || null,
      duration: extractedDuration,
      fileSize,
      version: 1,
      sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  console.log(`[insertEpisodeOnFileUpload] 已插入剧集: ${fileName} (sortOrder: ${sortOrder})`);

  return { id: episodeId, sortOrder };
}
