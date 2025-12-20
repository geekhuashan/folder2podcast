import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { getEnvConfig } from '../utils/env';
import { BilibiliDownloadRequest, BilibiliDownloadResult } from '../types';
import {
    getBBDownPath,
    isValidBilibiliUrl,
    extractVideoId,
    buildBBDownArgs,
    buildBBDownInfoArgs,
    extractFilePath,
    generatePodcastName,
    extractEpisodeTitle,
    parseVideoInfo,
    VideoInfo
} from '../utils/bbdown';

// 获取音频目录路径
const AUDIO_DIR = getEnvConfig().AUDIO_DIR;

/**
 * B 站视频下载服务
 *
 * 职责:
 * - 协调下载流程
 * - 处理副作用操作（spawn 进程、文件系统操作）
 * - 业务逻辑委托给纯函数处理
 */
export class BilibiliDownloadService {
    /**
     * 获取 B 站视频信息（包括分P列表）
     *
     * @param url - B 站视频 URL 或 ID
     * @returns Promise<视频信息>
     * @throws Error - 当 URL 无效或获取失败时抛出
     */
    async getVideoInfo(url: string): Promise<VideoInfo> {
        // 1. 验证 URL
        if (!isValidBilibiliUrl(url)) {
            throw new Error(`无效的 B 站视频 URL: ${url}`);
        }

        // 提取视频 ID
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error(`无法从 URL 中提取视频 ID: ${url}`);
        }

        // 2. 获取 BBDown 二进制路径
        const bbdownPath = getBBDownPath();
        await this.checkBBDownExists(bbdownPath);

        // 3. 构建获取信息的参数
        const args = buildBBDownInfoArgs(videoId);

        console.log(`获取视频信息: ${videoId}`);
        console.log(`执行命令: ${bbdownPath} ${args.join(' ')}`);

        // 4. 执行 BBDown -info 命令
        const output = await this.spawnBBDown(bbdownPath, args);

        // 5. 解析输出获取视频信息
        const videoInfo = parseVideoInfo(output, videoId);

        if (!videoInfo) {
            throw new Error('无法解析视频信息');
        }

        console.log(`视频信息获取成功: ${videoInfo.title}, 共 ${videoInfo.pages.length} 个分P`);

        return videoInfo;
    }

    /**
     * 下载 B 站视频并提取音频
     *
     * 工作流程:
     * 1. 验证请求参数
     * 2. 确定目标播客目录
     * 3. 调用 BBDown 下载音频
     * 4. 解析下载结果
     * 5. 返回下载信息
     *
     * @param request - 下载请求参数
     * @returns Promise<下载结果>
     * @throws Error - 当 URL 无效、下载失败或其他错误时抛出
     */
    async downloadAudio(request: BilibiliDownloadRequest): Promise<BilibiliDownloadResult> {
        const {
            url,
            podcastName,
            episodeTitle,
            autoCreatePodcast = true,
            selectPage
        } = request;

        // 1. 验证 URL（使用纯函数）
        if (!isValidBilibiliUrl(url)) {
            throw new Error(`无效的 B 站视频 URL: ${url}`);
        }

        // 提取视频 ID
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error(`无法从 URL 中提取视频 ID: ${url}`);
        }

        // 2. 确定目标目录和文件名
        const { targetDir, targetPodcastName, targetEpisodeTitle } = await this.prepareDownloadTarget(
            videoId,
            podcastName,
            episodeTitle,
            autoCreatePodcast
        );

        // 3. 调用 BBDown 下载音频
        console.log(`开始下载 B 站视频: ${videoId}`);
        console.log(`目标播客: ${targetPodcastName}`);
        console.log(`剧集标题: ${targetEpisodeTitle}`);
        if (selectPage) {
            console.log(`选择分P: ${selectPage}`);
        }

        const downloadedFilePath = await this.executeBBDown(
            videoId,
            targetDir,
            targetEpisodeTitle,
            selectPage
        );

        // 4. 构建返回结果（不可变数据）
        const fileName = path.basename(downloadedFilePath);

        const result: BilibiliDownloadResult = {
            success: true,
            filePath: downloadedFilePath,
            fileName,
            podcastName: targetPodcastName,
            episodeTitle: targetEpisodeTitle,
            videoInfo: {
                bvid: videoId,
                title: targetEpisodeTitle // BBDown 会在输出中包含原始标题，这里先用目标标题
            }
        };

        console.log(`下载完成: ${fileName}`);
        return result;
    }

    /**
     * 准备下载目标（确定目录和标题）
     *
     * @param videoId - 视频 ID
     * @param podcastName - 用户指定的播客名（可选）
     * @param episodeTitle - 用户指定的剧集标题（可选）
     * @param autoCreatePodcast - 是否自动创建播客目录
     * @returns 目标目录和标题信息
     * @private
     */
    private async prepareDownloadTarget(
        videoId: string,
        podcastName?: string,
        episodeTitle?: string,
        autoCreatePodcast: boolean = true
    ): Promise<{
        targetDir: string;
        targetPodcastName: string;
        targetEpisodeTitle: string;
    }> {
        // 确定播客名称
        let targetPodcastName: string;

        if (podcastName) {
            // 用户指定了播客名，使用用户指定的
            targetPodcastName = podcastName;
        } else if (autoCreatePodcast) {
            // 自动创建播客：使用视频 ID 作为临时播客名
            // 实际的播客名会在下载完成后从视频标题中提取
            targetPodcastName = `bilibili-${videoId}`;
        } else {
            throw new Error('未指定播客名称，且 autoCreatePodcast 为 false');
        }

        // 构建目标目录路径
        const targetDir = path.join(AUDIO_DIR, targetPodcastName);

        // 检查目录是否存在
        const dirExists = await this.checkDirectoryExists(targetDir);

        if (!dirExists) {
            if (!autoCreatePodcast && podcastName) {
                // 用户指定了不存在的播客名，且不允许自动创建
                throw new Error(`播客目录不存在: ${targetPodcastName}`);
            }

            // 创建目录
            await this.createDirectory(targetDir);
            console.log(`已创建播客目录: ${targetPodcastName}`);
        }

        // 确定剧集标题（如果用户未指定，使用视频标题模板）
        const targetEpisodeTitle = episodeTitle || '<videoTitle>';

        return {
            targetDir,
            targetPodcastName,
            targetEpisodeTitle
        };
    }

    /**
     * 执行 BBDown 命令下载音频
     *
     * @param videoId - 视频 ID
     * @param workDir - 工作目录
     * @param filePattern - 文件命名模板
     * @param selectPage - 选择的分P页码（可选）
     * @returns Promise<下载的文件路径>
     * @throws Error - 下载失败时抛出
     * @private
     */
    private async executeBBDown(
        videoId: string,
        workDir: string,
        filePattern: string,
        selectPage?: string
    ): Promise<string> {
        // 1. 获取 BBDown 二进制路径（使用纯函数）
        const bbdownPath = getBBDownPath();

        // 2. 检查二进制文件是否存在
        await this.checkBBDownExists(bbdownPath);

        // 3. 构建命令行参数（使用纯函数）
        const args = buildBBDownArgs({
            url: videoId,
            workDir,
            filePattern,
            selectPage
        });

        console.log(`执行命令: ${bbdownPath} ${args.join(' ')}`);

        // 4. 执行 BBDown 命令
        const output = await this.spawnBBDown(bbdownPath, args);

        // 5. 从输出中提取文件路径（使用纯函数）
        const filePath = extractFilePath(output);

        if (!filePath) {
            // 如果无法从输出提取文件路径，尝试查找目录中的最新文件
            const latestFile = await this.findLatestAudioFile(workDir);
            if (latestFile) {
                return latestFile;
            }

            throw new Error('BBDown 下载完成，但无法确定文件路径');
        }

        return filePath;
    }

    /**
     * 调用 BBDown 进程并收集输出
     *
     * @param bbdownPath - BBDown 二进制路径
     * @param args - 命令行参数
     * @returns Promise<完整的 stdout 输出>
     * @throws Error - 进程执行失败时抛出
     * @private
     */
    private spawnBBDown(bbdownPath: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            // 启动 BBDown 进程
            const child = spawn(bbdownPath, args);

            // 收集 stdout 和 stderr
            let stdoutData = '';
            let stderrData = '';

            // 监听 stdout（标准输出）
            child.stdout.on('data', (data: Buffer) => {
                const output = data.toString();
                stdoutData += output;

                // 实时输出到控制台
                process.stdout.write(output);
            });

            // 监听 stderr（错误输出）
            child.stderr.on('data', (data: Buffer) => {
                const output = data.toString();
                stderrData += output;

                // 实时输出到控制台
                process.stderr.write(output);
            });

            // 监听进程错误
            child.on('error', (error) => {
                reject(new Error(`BBDown 进程启动失败: ${error.message}`));
            });

            // 监听进程结束
            child.on('close', (code) => {
                if (code === 0) {
                    // 成功完成
                    resolve(stdoutData);
                } else {
                    // 执行失败
                    const errorMessage = stderrData || stdoutData || `进程退出码: ${code}`;
                    reject(new Error(`BBDown 执行失败: ${errorMessage}`));
                }
            });
        });
    }

    /**
     * 检查 BBDown 二进制文件是否存在
     *
     * @param bbdownPath - BBDown 二进制路径
     * @throws Error - 文件不存在时抛出
     * @private
     */
    private async checkBBDownExists(bbdownPath: string): Promise<void> {
        try {
            await fs.access(bbdownPath, fs.constants.X_OK);
        } catch (error) {
            throw new Error(
                `BBDown 二进制文件不存在或无执行权限: ${bbdownPath}\n` +
                `请确保已按命名规则放置二进制文件到 bin/ 目录`
            );
        }
    }

    /**
     * 检查目录是否存在
     *
     * @param dirPath - 目录路径
     * @returns Promise<是否存在>
     * @private
     */
    private async checkDirectoryExists(dirPath: string): Promise<boolean> {
        try {
            const stat = await fs.stat(dirPath);
            return stat.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * 创建目录
     *
     * @param dirPath - 目录路径
     * @throws Error - 创建失败时抛出
     * @private
     */
    private async createDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error: any) {
            throw new Error(`创建目录失败: ${error.message}`);
        }
    }

    /**
     * 查找目录中最新的音频文件
     *
     * 当无法从 BBDown 输出提取文件路径时，使用此方法作为备用方案
     *
     * @param dirPath - 目录路径
     * @returns Promise<文件路径 | null>
     * @private
     */
    private async findLatestAudioFile(dirPath: string): Promise<string | null> {
        try {
            const files = await fs.readdir(dirPath);

            // 过滤音频文件（常见扩展名）
            const audioExtensions = ['.m4a', '.mp3', '.aac', '.flac', '.wav'];
            const audioFiles = files.filter(file =>
                audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
            );

            if (audioFiles.length === 0) {
                return null;
            }

            // 获取文件的修改时间并排序
            const filesWithStats = await Promise.all(
                audioFiles.map(async (file) => {
                    const filePath = path.join(dirPath, file);
                    const stat = await fs.stat(filePath);
                    return { filePath, mtime: stat.mtime };
                })
            );

            // 按修改时间降序排序，返回最新的文件
            filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            return filesWithStats[0].filePath;
        } catch (error) {
            return null;
        }
    }
}
