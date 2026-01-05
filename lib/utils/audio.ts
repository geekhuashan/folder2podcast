import { parseFile, parseBuffer } from 'music-metadata';
import { readFile, stat } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * 音频元数据提取工具
 * - 使用 ffprobe 提取时长（准确可靠）
 * - 使用 music-metadata 提取其他元数据（title, artist, album）
 */

/**
 * 使用 ffprobe 提取音频时长
 *
 * @param filePath - 音频文件路径
 * @returns 时长（秒），提取失败返回 0
 */
async function extractDurationWithFFprobe(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 0 : Math.round(duration);
  } catch (error) {
    console.warn(`[ffprobe] 提取时长失败: ${path.basename(filePath)}`, error);
    return 0;
  }
}

/**
 * 使用 ffprobe 从 Buffer 提取音频时长
 *
 * @param buffer - 音频文件 Buffer
 * @param fileName - 文件名（用于临时文件）
 * @returns 时长（秒），提取失败返回 0
 */
async function extractDurationFromBuffer(buffer: Buffer, fileName: string): Promise<number> {
  try {
    // 创建临时文件
    const tmpPath = `/tmp/${Date.now()}-${fileName}`;
    const fs = await import('fs/promises');
    await fs.writeFile(tmpPath, buffer);

    // 提取时长
    const duration = await extractDurationWithFFprobe(tmpPath);

    // 删除临时文件
    await fs.unlink(tmpPath).catch(() => {});

    return duration;
  } catch (error) {
    console.warn(`[ffprobe] 提取时长失败: ${fileName}`, error);
    return 0;
  }
}


/**
 * 音频元数据类型
 */
export interface AudioMetadata {
  // 时长（秒）
  duration: number;
  // 标题（从 ID3 标签提取，如果没有则为空）
  title?: string;
  // 艺术家
  artist?: string;
  // 专辑
  album?: string;
  // 文件大小（字节）
  fileSize: number;
  // 比特率（kbps）
  bitrate?: number;
}

/**
 * 从文件路径提取音频元数据
 *
 * @param filePath - 音频文件的绝对路径
 * @returns 音频元数据
 *
 * @example
 * ```ts
 * const metadata = await extractMetadataFromFile('/path/to/audio.mp3');
 * console.log(metadata.duration); // 180 (秒)
 * console.log(metadata.title); // '我的播客第一集'
 * ```
 *
 * 说明：
 * - 使用 ffprobe 提取时长（准确可靠）
 * - 使用 music-metadata 提取其他元数据（title, artist, album）
 */
export async function extractMetadataFromFile(
  filePath: string
): Promise<AudioMetadata> {
  try {
    // 1. 使用 ffprobe 提取时长
    const duration = await extractDurationWithFFprobe(filePath);

    // 2. 使用 music-metadata 提取其他元数据
    const metadata = await parseFile(filePath, { duration: false });

    // 3. 获取文件大小
    const stats = await stat(filePath);

    return {
      duration,
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      fileSize: stats.size,
      bitrate: metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : undefined,
    };
  } catch (error) {
    console.warn(
      `[extractMetadataFromFile] 提取元数据失败: ${path.basename(filePath)}`,
      error
    );

    // 提取失败时返回默认值
    const stats = await stat(filePath);
    return {
      duration: 0,
      fileSize: stats.size,
    };
  }
}

/**
 * 从 Buffer 提取音频元数据
 * 用于处理上传的文件（尚未保存到磁盘）
 *
 * @param buffer - 音频文件的 Buffer
 * @param fileName - 文件名（用于推断 MIME 类型）
 * @returns 音频元数据
 *
 * @example
 * ```ts
 * const buffer = await file.arrayBuffer();
 * const metadata = await extractMetadataFromBuffer(
 *   Buffer.from(buffer),
 *   'episode01.mp3'
 * );
 * ```
 *
 * 说明：
 * - 使用 ffprobe 提取时长（准确可靠）
 * - 使用 music-metadata 提取其他元数据（title, artist, album）
 */
export async function extractMetadataFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<Omit<AudioMetadata, 'fileSize'>> {
  try {
    // 1. 使用 ffprobe 提取时长（需要临时文件）
    const duration = await extractDurationFromBuffer(buffer, fileName);

    // 2. 使用 music-metadata 提取其他元数据
    const mimeType = getMimeType(fileName);
    const metadata = await parseBuffer(buffer, { mimeType }, { duration: false });

    return {
      duration,
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      bitrate: metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : undefined,
    };
  } catch (error) {
    console.warn(
      `[extractMetadataFromBuffer] 提取元数据失败: ${fileName}`,
      error
    );

    // 提取失败时返回默认值
    return {
      duration: 0,
    };
  }
}

/**
 * 根据文件扩展名获取 MIME 类型
 *
 * @param fileName - 文件名
 * @returns MIME 类型
 *
 * @example
 * ```ts
 * getMimeType('episode01.mp3') // => 'audio/mpeg'
 * getMimeType('episode01.m4a') // => 'audio/mp4'
 * ```
 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
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

/**
 * 检查文件是否为音频文件
 *
 * @param fileName - 文件名
 * @returns 如果是音频文件则返回 true
 *
 * @example
 * ```ts
 * isAudioFile('episode01.mp3') // => true
 * isAudioFile('cover.jpg') // => false
 * ```
 */
export function isAudioFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac'];
  return audioExtensions.includes(ext);
}

/**
 * 格式化时长为人类可读的格式
 *
 * @param seconds - 秒数
 * @returns 格式化后的时长字符串（HH:MM:SS 或 MM:SS）
 *
 * @example
 * ```ts
 * formatDuration(90) // => '1:30'
 * formatDuration(3661) // => '1:01:01'
 * ```
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * 格式化文件大小为人类可读的格式
 *
 * @param bytes - 字节数
 * @returns 格式化后的文件大小字符串
 *
 * @example
 * ```ts
 * formatFileSize(1024) // => '1.00 KB'
 * formatFileSize(1048576) // => '1.00 MB'
 * formatFileSize(5242880) // => '5.00 MB'
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
