import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { getEnvConfig } from './env';

const AUDIO_DIR = getEnvConfig().AUDIO_DIR;

/**
 * 临时目录管理
 */
const TEMP_DIR_BASE = path.join(AUDIO_DIR, '.temp');

/**
 * 创建任务临时目录
 *
 * @returns { taskId: 唯一任务ID, tempDir: 临时目录路径 }
 */
export async function createTempDir(): Promise<{ taskId: string; tempDir: string }> {
    const taskId = uuidv4();
    const tempDir = path.join(TEMP_DIR_BASE, taskId);

    await fs.ensureDir(tempDir);
    console.log(`[FileUtils] 创建临时目录: ${tempDir}`);

    return { taskId, tempDir };
}

/**
 * 清理任务临时目录
 *
 * @param taskId - 任务ID
 */
export async function cleanupTempDir(taskId: string): Promise<void> {
    const tempDir = path.join(TEMP_DIR_BASE, taskId);

    try {
        await fs.remove(tempDir);
        console.log(`[FileUtils] 已清理临时目录: ${tempDir}`);
    } catch (error) {
        console.warn(`[FileUtils] 清理临时目录失败: ${tempDir}`, error);
    }
}

/**
 * 移动文件到播客目录（扁平化结构）
 *
 * @param filePaths - 源文件路径列表（绝对路径）
 * @param podcastDir - 目标播客目录（绝对路径）
 * @returns 移动后的文件路径列表（绝对路径）
 */
export async function moveFilesToPodcast(
    filePaths: string[],
    podcastDir: string
): Promise<string[]> {
    const movedFiles: string[] = [];

    for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        const targetPath = path.join(podcastDir, fileName);

        // 处理文件名冲突
        let finalPath = targetPath;
        let counter = 1;
        while (await fs.pathExists(finalPath)) {
            const ext = path.extname(fileName);
            const baseName = path.basename(fileName, ext);
            finalPath = path.join(podcastDir, `${baseName}_${counter}${ext}`);
            counter++;
        }

        await fs.move(filePath, finalPath, { overwrite: false });
        console.log(`[FileUtils] 移动文件: ${fileName} -> ${path.basename(finalPath)}`);

        movedFiles.push(finalPath);
    }

    return movedFiles;
}

/**
 * 确保播客目录存在（包含用户隔离）
 *
 * @param userId - 用户ID
 * @param podcastName - 播客名称
 * @returns 播客目录的绝对路径
 */
export async function ensurePodcastDir(
    userId: string,
    podcastName: string
): Promise<string> {
    const podcastDir = path.join(AUDIO_DIR, userId, podcastName);
    await fs.ensureDir(podcastDir);
    return podcastDir;
}

/**
 * 初始化临时目录（应用启动时调用）
 */
export async function initializeTempDir(): Promise<void> {
    try {
        // 清理所有旧的临时文件
        await fs.emptyDir(TEMP_DIR_BASE);
        console.log('[FileUtils] 临时目录已初始化');
    } catch (error) {
        console.error('[FileUtils] 初始化临时目录失败:', error);
    }
}

/**
 * 清理过期的临时目录（超过24小时）
 */
export async function cleanupExpiredTempDirs(): Promise<void> {
    try {
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        const dirs = await fs.readdir(TEMP_DIR_BASE);

        for (const dir of dirs) {
            const dirPath = path.join(TEMP_DIR_BASE, dir);
            const stats = await fs.stat(dirPath);

            if (now - stats.mtimeMs > ONE_DAY) {
                await fs.remove(dirPath);
                console.log(`[FileUtils] 清理过期临时目录: ${dir}`);
            }
        }
    } catch (error) {
        console.warn('[FileUtils] 清理过期临时目录失败:', error);
    }
}

/**
 * 检测音频文件的封面图片
 *
 * @param audioFileName - 音频文件名（例如：episode001.mp3）
 * @param dirPath - 播客目录路径
 * @returns 封面文件名（相对于播客目录），如果不存在则返回 null
 *
 * 检测规则：
 * - 同名封面：{audioBaseName}.jpg/png/jpeg（与音频文件同名）
 *
 * 示例：
 * - episode001.mp3 → 查找 episode001.jpg
 * - [P01]1.以父之名.m4a → 查找 [P01]1.以父之名.jpg
 */
export async function detectEpisodeCover(
    audioFileName: string,
    dirPath: string
): Promise<string | null> {
    // 提取音频文件的基础名称（不含扩展名）
    const audioBaseName = path.basename(audioFileName, path.extname(audioFileName));

    // 支持的图片扩展名
    const imageExtensions = ['.jpg', '.jpeg', '.png'];

    // 检测同名封面
    for (const ext of imageExtensions) {
        const coverFileName = `${audioBaseName}${ext}`;
        const coverPath = path.join(dirPath, coverFileName);

        // 检查文件是否存在
        if (await fs.pathExists(coverPath)) {
            return coverFileName;
        }
    }

    // 未找到封面
    return null;
}

/**
 * 检测播客的默认封面图片
 *
 * @param podcastDirName - 播客目录名
 * @param dirPath - 播客目录的完整路径
 * @returns 封面文件名（相对于播客目录），如果不存在则返回 null
 *
 * 检测规则：
 * - 查找 cover.jpg/png/jpeg
 *
 * 示例：
 * - 盲冢/ → 查找 cover.jpg 或 cover.png
 */
export async function detectPodcastCover(
    podcastDirName: string,
    dirPath: string
): Promise<string | null> {
    // 支持的图片扩展名
    const imageExtensions = ['.jpg', '.jpeg', '.png'];

    // 查找 cover 文件
    for (const ext of imageExtensions) {
        const coverFileName = `cover${ext}`;
        const coverPath = path.join(dirPath, coverFileName);

        // 检查文件是否存在
        if (await fs.pathExists(coverPath)) {
            return coverFileName;
        }
    }

    // 未找到封面
    return null;
}
