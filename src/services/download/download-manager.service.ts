import path from 'path';
import fs from 'fs-extra';
import { IDownloadAdapter, DownloadResult } from '../../adapters/base/download-adapter.interface';
import { TempFileManager } from './temp-file-manager.service';

/**
 * 统一下载请求接口
 */
export interface UnifiedDownloadRequest {
    /** 视频 URL */
    url: string;
    /** 目标播客名称 */
    podcastName: string;
    /** 自定义剧集标题（可选） */
    episodeTitle?: string;
    /** 文件命名模板（可选） */
    fileNamePattern?: string;
    /** 选中的分P索引（可选） */
    selectedParts?: number[];
    /** 质量选项（可选） */
    quality?: string;
}

/**
 * 统一下载响应接口
 */
export interface UnifiedDownloadResponse {
    /** 是否成功 */
    success: boolean;
    /** 下载的文件路径列表（相对于 AUDIO_DIR） */
    filePaths: string[];
    /** 播客名称 */
    podcastName: string;
    /** 视频信息 */
    videoInfo?: any;
    /** 错误信息 */
    error?: string;
}

/**
 * 下载管理器服务
 *
 * 职责：
 * - 协调适配器和临时文件管理器
 * - 实现统一的下载流程
 * - 处理文件从临时目录到播客目录的移动
 * - 自动创建播客目录
 */
export class DownloadManager {
    private readonly audioDir: string;
    private readonly tempFileManager: TempFileManager;

    constructor(audioDir: string, tempFileManager: TempFileManager) {
        this.audioDir = audioDir;
        this.tempFileManager = tempFileManager;
    }

    /**
     * 统一下载接口
     *
     * 流程：
     * 1. 创建任务临时目录
     * 2. 调用适配器下载到临时目录
     * 3. 移动文件到播客目录
     * 4. 清理临时目录
     *
     * @param adapter - 下载适配器
     * @param request - 下载请求
     * @returns 下载结果
     */
    async downloadToPodcast(
        adapter: IDownloadAdapter,
        request: UnifiedDownloadRequest
    ): Promise<UnifiedDownloadResponse> {
        const { url, podcastName, episodeTitle, fileNamePattern, selectedParts, quality } = request;

        // 1. 创建任务临时目录
        const { taskId, tempDir } = await this.tempFileManager.createTaskTempDir();
        console.log(`[DownloadManager] 任务 ${taskId} 开始下载`);

        try {
            // 2. 调用适配器下载到临时目录
            console.log(`[DownloadManager] 使用 ${adapter.platform} 适配器下载...`);

            const downloadResult: DownloadResult = await adapter.download({
                url,
                outputDir: tempDir,
                fileNamePattern: fileNamePattern || episodeTitle,
                selectedParts,
                audioOnly: true,
                quality
            });

            // 检查下载是否成功
            if (!downloadResult.success) {
                throw new Error(downloadResult.error || '下载失败');
            }

            if (downloadResult.filePaths.length === 0) {
                throw new Error('下载完成，但没有找到任何文件');
            }

            console.log(`[DownloadManager] 下载完成，共 ${downloadResult.filePaths.length} 个文件`);

            // 3. 准备目标播客目录
            const podcastDir = path.join(this.audioDir, podcastName);
            await fs.ensureDir(podcastDir);

            // 4. 移动文件到播客目录（扁平结构）
            console.log(`[DownloadManager] 移动文件到播客目录: ${podcastName}`);

            const movedFiles = await this.tempFileManager.moveFilesToTarget(
                downloadResult.filePaths,
                podcastDir
            );

            // 5. 清理临时目录
            await this.tempFileManager.cleanupTaskTempDir(taskId);

            console.log(`[DownloadManager] 任务 ${taskId} 完成`);

            // 返回相对路径（相对于 audioDir）
            const relativeFilePaths = movedFiles.map(filePath =>
                path.relative(this.audioDir, filePath)
            );

            return {
                success: true,
                filePaths: relativeFilePaths,
                podcastName,
                videoInfo: downloadResult.videoInfo
            };

        } catch (error) {
            console.error(`[DownloadManager] 任务 ${taskId} 失败:`, error);

            // 清理临时目录（即使失败也要清理）
            try {
                await this.tempFileManager.cleanupTaskTempDir(taskId);
            } catch (cleanupError) {
                console.warn(`[DownloadManager] 清理临时目录失败:`, cleanupError);
            }

            return {
                success: false,
                filePaths: [],
                podcastName,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 获取视频信息（不下载）
     * 用于前端显示分P列表等信息
     *
     * @param adapter - 下载适配器
     * @param url - 视频 URL
     */
    async getVideoInfo(adapter: IDownloadAdapter, url: string) {
        console.log(`[DownloadManager] 获取视频信息: ${url}`);
        return await adapter.getVideoInfo(url);
    }

    /**
     * 检查适配器是否可用
     *
     * @param adapter - 下载适配器
     */
    async checkAdapterAvailability(adapter: IDownloadAdapter): Promise<boolean> {
        console.log(`[DownloadManager] 检查 ${adapter.platform} 适配器可用性`);
        return await adapter.checkAvailability();
    }
}
