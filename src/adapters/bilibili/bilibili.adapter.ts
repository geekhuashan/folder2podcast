import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { BaseDownloadAdapter } from '../base/download-adapter.base';
import {
    DownloadPlatform,
    DownloadOptions,
    DownloadResult,
    VideoInfo,
    AudioFile
} from '../base/download-adapter.interface';
import {
    getBBDownPath,
    isValidBilibiliUrl,
    extractVideoId,
    buildBBDownInfoArgs,
    buildBBDownArgs,
    parseVideoInfo,
    parsePublishDate,
    parseOwnerInfo,
    buildCoverDownloadArgs,
    generateEpisodeDescription,
    extractTitleFromFileName,
    VideoInfo as BBDownVideoInfo
} from './bbdown.utils';

/**
 * Bilibili 下载适配器（重构版）
 *
 * 核心改进：
 * - download() 方法返回包含完整元数据的 AudioFile[]
 * - 自动下载封面并填充到 AudioFile.coverPath
 * - 自动提取标题、描述、发布时间等信息
 * - 服务层无需额外处理，直接使用返回的数据
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
     * 获取视频信息（可选方法，用于预览）
     *
     * 注意：download() 会自动获取视频信息，这个方法仅用于预览
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

            // 提取额外元数据
            const publishDate = parsePublishDate(output);
            const ownerInfo = parseOwnerInfo(output);

            // 转换为统一的 VideoInfo 格式
            return this.convertToVideoInfo(bbdownVideoInfo, publishDate, ownerInfo);
        } catch (error) {
            this.log(`获取视频信息失败: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * 下载音频并返回完整的文件信息（核心方法）
     *
     * 流程：
     * 1. 获取视频信息（标题、分P列表、发布时间等）
     * 2. 下载音频文件到临时目录
     * 3. 为每个音频文件下载封面
     * 4. 构建包含完整元数据的 AudioFile[]
     */
    async download(options: DownloadOptions): Promise<DownloadResult> {
        const { url, outputDir, fileNamePattern, selectedParts } = options;

        this.log(`开始下载: ${url}`);
        this.log(`输出目录: ${outputDir}`);

        // 验证 URL
        if (!this.isValidUrl(url)) {
            return {
                success: false,
                audioFiles: [],
                error: `无效的 B站视频链接: ${url}`
            };
        }

        // 提取视频 ID
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return {
                success: false,
                audioFiles: [],
                error: `无法提取视频 ID: ${url}`
            };
        }

        try {
            // 确保输出目录存在
            await fs.ensureDir(outputDir);

            // 1. 获取视频信息（包含标题、分P列表、发布时间等）
            this.log('获取视频信息...');
            const videoInfo = await this.getVideoInfo(url);
            this.log(`视频标题: ${videoInfo.title}`);
            this.log(`分P数量: ${videoInfo.parts.length}`);

            // 2. 下载音频文件
            this.log('下载音频文件...');
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

            // 3. 查找下载的音频文件
            const audioFilePaths = await this.findDownloadedFiles(outputDir);

            if (audioFilePaths.length === 0) {
                return {
                    success: false,
                    audioFiles: [],
                    error: '下载完成，但未找到任何音频文件'
                };
            }

            this.log(`找到 ${audioFilePaths.length} 个音频文件`);

            // 4. 为每个音频文件构建完整的元数据
            const audioFiles: AudioFile[] = await Promise.all(
                audioFilePaths.map((filePath, index) =>
                    this.buildAudioFileInfo(filePath, index, videoInfo, outputDir, url)
                )
            );

            this.log(`下载成功，共 ${audioFiles.length} 个文件`);

            return {
                success: true,
                audioFiles
            };

        } catch (error) {
            this.log(`下载失败: ${error}`, 'error');
            return {
                success: false,
                audioFiles: [],
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
     * 为单个音频文件构建完整的元数据信息
     *
     * @param filePath - 音频文件路径
     * @param index - 文件索引（在下载列表中的位置）
     * @param videoInfo - 视频信息
     * @param outputDir - 输出目录
     * @param originalUrl - 原始视频URL
     * @returns Promise<AudioFile>
     */
    private async buildAudioFileInfo(
        filePath: string,
        index: number,
        videoInfo: VideoInfo,
        outputDir: string,
        originalUrl: string
    ): Promise<AudioFile> {
        const fileName = path.basename(filePath);
        const fileNameWithoutExt = path.parse(fileName).name;

        // 找到对应的分P信息（如果有）
        const partInfo = videoInfo.parts[index];

        // 🔥 关键：下载封面
        let coverPath: string | undefined;
        try {
            this.log(`为 ${fileName} 下载封面...`);
            const coverFileName = fileNameWithoutExt;
            const downloadedCoverPath = await this.downloadCoverForEpisode(
                originalUrl,
                outputDir,
                coverFileName
            );
            if (downloadedCoverPath) {
                coverPath = downloadedCoverPath;
                this.log(`封面下载成功: ${path.basename(coverPath)}`);
            }
        } catch (error) {
            this.log(`封面下载失败: ${error}`, 'warn');
            // 封面下载失败不影响整体流程
        }

        // 🔥 关键：生成描述（包含BV号、UP主ID、发布日期）
        const description = generateEpisodeDescription(videoInfo);

        // ⭐ 智能标题提取（修复占位标题问题）
        // 1. 优先从文件名提取真实标题（适用于 BBDown 下载的分P视频）
        let title = extractTitleFromFileName(fileName);

        // 2. 如果文件名提取失败，检查 partInfo.title 是否为占位符
        if (!title && partInfo) {
            const isPlaceholder = /^P\d+$/i.test(partInfo.title);
            if (isPlaceholder) {
                // 占位符标题（如 "P6"），使用视频主标题
                title = videoInfo.title;
            } else {
                // 真实的分P标题，直接使用
                title = partInfo.title;
            }
        }

        // 3. 最终兜底：使用视频主标题
        if (!title) {
            title = videoInfo.title;
        }

        // 构建 AudioFile 对象
        const audioFile: AudioFile = {
            filePath,
            fileName,
            // ✅ 标题：使用智能提取的标题
            title,
            // ✅ 描述：自动生成的元数据描述
            description,
            // ✅ 封面：下载的封面路径
            coverPath,
            // ✅ 发布时间：从视频信息中获取
            publishDate: videoInfo.publishDate,
            // ✅ 时长：从分P信息中获取
            duration: partInfo?.duration,
            // ✅ 作者：UP主昵称或ID
            author: videoInfo.ownerName || (videoInfo.ownerMid ? `UP主 ${videoInfo.ownerMid}` : undefined),
            // ✅ 视频ID：BV号
            videoId: videoInfo.id,
            // ✅ 分P索引：分P的序号
            partIndex: partInfo?.index
        };

        return audioFile;
    }

    /**
     * 下载单个剧集的封面
     *
     * @param url - 视频URL或ID
     * @param outputDir - 输出目录
     * @param fileName - 文件名（不含扩展名）
     * @returns Promise<封面文件路径>，失败返回 null
     */
    private async downloadCoverForEpisode(
        url: string,
        outputDir: string,
        fileName: string
    ): Promise<string | null> {
        // 验证 URL
        if (!this.isValidUrl(url)) {
            this.log(`无效的 B站视频链接: ${url}`, 'error');
            return null;
        }

        // 提取视频 ID
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.log(`无法提取视频 ID: ${url}`, 'error');
            return null;
        }

        // 创建临时目录（避免 BBDown 在播客目录下创建子目录）
        const tempDir = path.join(outputDir, '.cover_temp_' + Date.now());

        try {
            // 确保临时目录存在
            await fs.ensureDir(tempDir);

            // 构建封面下载参数（使用临时目录）
            const bbdownPath = getBBDownPath();
            const args = buildCoverDownloadArgs(videoId, tempDir, fileName);

            // 执行下载
            await this.executeBBDown(bbdownPath, args);

            // 递归查找下载的封面文件（BBDown 可能创建了子目录）
            const coverFiles = await this.findCoverFiles(tempDir);

            if (coverFiles.length === 0) {
                this.log('封面下载完成，但未找到封面文件', 'warn');
                return null;
            }

            // 移动第一个封面文件到目标目录
            const sourceCover = coverFiles[0];
            const ext = path.extname(sourceCover);
            const targetCover = path.join(outputDir, `${fileName}${ext}`);

            await fs.move(sourceCover, targetCover, { overwrite: true });

            return targetCover;

        } catch (error) {
            this.log(`封面下载失败: ${error}`, 'error');
            return null;
        } finally {
            // 清理临时目录
            try {
                await fs.remove(tempDir);
            } catch (cleanupError) {
                this.log(`清理临时目录失败: ${cleanupError}`, 'warn');
            }
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
                // 输出所有 stdout 内容到控制台
                this.log(chunk.trim(), 'info');
            });

            process.stderr?.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                // 输出所有 stderr 内容到控制台（通常是警告信息）
                this.log(chunk.trim(), 'warn');
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
                    // 跳过临时封面目录
                    if (entry.name.startsWith('.cover_temp_')) {
                        continue;
                    }
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
     * 递归查找封面文件
     *
     * @param dir - 搜索目录
     * @returns 封面文件路径列表
     */
    private async findCoverFiles(dir: string): Promise<string[]> {
        const coverExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const files: string[] = [];

        const search = async (currentDir: string): Promise<void> => {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    // 递归搜索子目录
                    await search(fullPath);
                } else if (entry.isFile()) {
                    // 检查是否为图片文件
                    const isImage = coverExtensions.some(ext =>
                        entry.name.toLowerCase().endsWith(ext)
                    );

                    if (isImage) {
                        files.push(fullPath);
                    }
                }
            }
        };

        await search(dir);
        return files;
    }

    /**
     * 转换 BBDown 视频信息为统一格式，包含额外元数据
     */
    private convertToVideoInfo(
        bbdownInfo: BBDownVideoInfo,
        publishDate?: string | null,
        ownerInfo?: { name?: string; mid?: string }
    ): VideoInfo {
        return {
            id: bbdownInfo.bvid,
            title: bbdownInfo.title,
            author: bbdownInfo.author,
            duration: undefined,
            isMultiPart: bbdownInfo.isMultiPage,
            parts: bbdownInfo.pages.map(page => ({
                index: page.index,
                title: page.title,
                duration: page.duration,
                id: `P${page.index}`
            })),
            thumbnail: undefined,
            platform: DownloadPlatform.BILIBILI,

            // 添加额外元数据
            publishDate: publishDate || undefined,
            ownerName: ownerInfo?.name,
            ownerMid: ownerInfo?.mid
        };
    }
}
