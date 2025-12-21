import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { BaseDownloadAdapter } from '../base/download-adapter.base';
import {
    DownloadPlatform,
    DownloadOptions,
    DownloadResult,
    VideoInfo,
    VideoPartInfo
} from '../base/download-adapter.interface';
import {
    getBBDownPath,
    isValidBilibiliUrl,
    extractVideoId,
    buildBBDownInfoArgs,
    buildBBDownArgs,
    parseVideoInfo,
    VideoInfo as BBDownVideoInfo
} from './bbdown.utils';

/**
 * Bilibili 下载适配器
 *
 * 负责:
 * - 使用 BBDown 工具下载 B站视频
 * - 提取音频到临时目录
 * - 处理多分P视频
 * - 标准化文件名
 */
export class BilibiliAdapter extends BaseDownloadAdapter {
    readonly platform = DownloadPlatform.BILIBILI;

    /**
     * 验证 URL 是否为有效的 B站视频链接
     */
    isValidUrl(url: string): boolean {
        return isValidBilibiliUrl(url);
    }

    /**
     * 从 URL 提取视频 ID (BV号或AV号)
     */
    extractVideoId(url: string): string | null {
        return extractVideoId(url);
    }

    /**
     * 获取视频信息（包括分P列表）
     */
    async getVideoInfo(url: string): Promise<VideoInfo> {
        this.log(`获取视频信息: ${url}`);

        // 验证 URL
        if (!this.isValidUrl(url)) {
            throw new Error(`无效的 B站视频链接: ${url}`);
        }

        // 提取视频 ID
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            throw new Error(`无法提取视频 ID: ${url}`);
        }

        try {
            // 执行 BBDown -info 命令获取视频信息
            const bbdownPath = getBBDownPath();
            const args = buildBBDownInfoArgs(videoId);

            this.log(`执行命令: ${bbdownPath} ${args.join(' ')}`);

            const output = await this.executeBBDown(bbdownPath, args);

            // 解析视频信息
            const bbdownVideoInfo = parseVideoInfo(output, videoId);
            if (!bbdownVideoInfo) {
                throw new Error('无法解析视频信息');
            }

            // 转换为统一的 VideoInfo 格式
            return this.convertToVideoInfo(bbdownVideoInfo);
        } catch (error) {
            this.log(`获取视频信息失败: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * 下载视频/音频到指定目录
     */
    async download(options: DownloadOptions): Promise<DownloadResult> {
        const { url, outputDir, fileNamePattern, selectedParts, audioOnly = true } = options;

        this.log(`开始下载: ${url}`);
        this.log(`输出目录: ${outputDir}`);

        // 验证 URL
        if (!this.isValidUrl(url)) {
            return {
                success: false,
                filePaths: [],
                videoInfo: this.createEmptyVideoInfo(),
                error: `无效的 B站视频链接: ${url}`
            };
        }

        // 提取视频 ID
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return {
                success: false,
                filePaths: [],
                videoInfo: this.createEmptyVideoInfo(),
                error: `无法提取视频 ID: ${url}`
            };
        }

        try {
            // 确保输出目录存在
            await fs.ensureDir(outputDir);

            // 获取视频信息
            const videoInfo = await this.getVideoInfo(url);

            // 构建 BBDown 参数
            const bbdownPath = getBBDownPath();

            // 确定文件命名模板
            let actualFilePattern = fileNamePattern || '<pageNumberWithZero>.<pageTitle>';

            // 如果是单P视频，使用视频标题
            if (!videoInfo.isMultiPart) {
                actualFilePattern = fileNamePattern || videoInfo.title;
            }

            // 处理分P选择
            let selectPage: string | undefined;
            if (selectedParts && selectedParts.length > 0) {
                // 转换为 BBDown 的 -p 参数格式: "1,2,3"
                selectPage = selectedParts.join(',');
            }

            const args = buildBBDownArgs({
                url: videoId,
                workDir: outputDir,
                filePattern: actualFilePattern,
                selectPage
            });

            this.log(`执行命令: ${bbdownPath} ${args.join(' ')}`);

            // 执行下载
            await this.executeBBDown(bbdownPath, args);

            // 查找下载的文件
            const filePaths = await this.findDownloadedFiles(outputDir);

            if (filePaths.length === 0) {
                return {
                    success: false,
                    filePaths: [],
                    videoInfo,
                    error: '下载完成，但未找到任何音频文件'
                };
            }

            this.log(`下载成功，共 ${filePaths.length} 个文件`);

            return {
                success: true,
                filePaths,
                videoInfo
            };

        } catch (error) {
            this.log(`下载失败: ${error}`, 'error');
            return {
                success: false,
                filePaths: [],
                videoInfo: this.createEmptyVideoInfo(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 检查 BBDown 工具是否可用
     */
    async checkAvailability(): Promise<boolean> {
        try {
            const bbdownPath = getBBDownPath();

            // 检查文件是否存在
            if (!await fs.pathExists(bbdownPath)) {
                this.log(`BBDown 工具不存在: ${bbdownPath}`, 'warn');
                return false;
            }

            // 检查文件是否可执行
            const stats = await fs.stat(bbdownPath);
            const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);

            if (!isExecutable) {
                this.log(`BBDown 文件不可执行: ${bbdownPath}`, 'warn');
                return false;
            }

            this.log(`BBDown 工具可用: ${bbdownPath}`);
            return true;
        } catch (error) {
            this.log(`BBDown 工具不可用: ${error}`, 'warn');
            return false;
        }
    }

    /**
     * 执行 BBDown 命令并返回输出
     *
     * @param bbdownPath - BBDown 可执行文件路径
     * @param args - 命令行参数
     * @returns Promise<stdout 输出>
     */
    private executeBBDown(bbdownPath: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';

            const process = spawn(bbdownPath, args);

            process.stdout?.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                // 实时输出进度信息
                if (chunk.includes('%') || chunk.includes('下载')) {
                    this.log(chunk.trim(), 'info');
                }
            });

            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('error', (error) => {
                reject(new Error(`执行 BBDown 失败: ${error.message}`));
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`BBDown 退出码: ${code}\n${stderr || stdout}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * 查找下载完成的音频文件（递归查找）
     *
     * @param outputDir - 输出目录
     * @param maxDepth - 最大递归深度（默认3层）
     * @returns 文件路径列表
     */
    private async findDownloadedFiles(outputDir: string, maxDepth: number = 3): Promise<string[]> {
        const audioExtensions = ['.m4a', '.mp3', '.aac', '.flac', '.wav'];
        const files: string[] = [];

        const findRecursive = async (currentDir: string, depth: number): Promise<void> => {
            if (depth > maxDepth) {
                return;
            }

            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    // 递归查找子目录
                    await findRecursive(fullPath, depth + 1);
                } else if (entry.isFile()) {
                    // 检查是否为音频文件
                    const isAudio = audioExtensions.some(ext =>
                        entry.name.toLowerCase().endsWith(ext)
                    );

                    if (isAudio) {
                        files.push(fullPath);
                    }
                }
            }
        };

        await findRecursive(outputDir, 0);
        return files;
    }

    /**
     * 转换 BBDown 视频信息为统一格式
     */
    private convertToVideoInfo(bbdownInfo: BBDownVideoInfo): VideoInfo {
        const parts: VideoPartInfo[] = bbdownInfo.pages.map(page => ({
            index: page.index,
            title: page.title,
            duration: page.duration,
            id: `P${page.index}`
        }));

        return {
            id: bbdownInfo.bvid,
            title: bbdownInfo.title,
            author: bbdownInfo.author,
            duration: undefined,
            isMultiPart: bbdownInfo.isMultiPage,
            parts,
            thumbnail: undefined,
            platform: DownloadPlatform.BILIBILI
        };
    }

    /**
     * 创建空的视频信息对象（用于错误返回）
     */
    private createEmptyVideoInfo(): VideoInfo {
        return {
            id: '',
            title: '',
            author: undefined,
            duration: undefined,
            isMultiPart: false,
            parts: [],
            thumbnail: undefined,
            platform: DownloadPlatform.BILIBILI
        };
    }
}
