import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { getEnvConfig } from '../utils/env';
import { BilibiliDownloadRequest, BilibiliDownloadResult } from '../types';
import { getDownloadAdapterFactory } from '../adapters/adapter-factory';
import { DownloadPlatform } from '../adapters/base/download-adapter.interface';
import { DownloadManager } from './download/download-manager.service';
import { TempFileManager } from './download/temp-file-manager.service';
import { VideoInfo as BBDownVideoInfo } from '../adapters/bilibili/bbdown.utils';

// 获取音频目录路径
const AUDIO_DIR = getEnvConfig().AUDIO_DIR;

/**
 * 任务进度状态
 */
export type TaskStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

/**
 * 任务进度信息
 */
export interface TaskProgress {
    taskId: string;
    status: TaskStatus;
    percent: number;
    speed: string;
    eta: string;
    current: number;
    total: number;
    url: string;
    podcastName: string;
    episodeTitle?: string;
    fileName?: string;
    filePaths?: string[];
    error?: string;
    createdAt: number;
    updatedAt: number;
}

/**
 * B 站视频下载服务（重构版）
 *
 * 职责:
 * - 提供 B站视频下载的公共 API
 * - 协调适配器工厂、下载管理器和临时文件管理器
 * - 保持向后兼容的接口
 */
export class BilibiliDownloadService {
    private adapterFactory: ReturnType<typeof getDownloadAdapterFactory>;
    private downloadManager: DownloadManager;
    private tempFileManager: TempFileManager;

    // 任务进度存储 (内存中，重启服务器会丢失)
    private taskProgressMap = new Map<string, TaskProgress>();

    // 清理定时器
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor() {
        // 初始化适配器工厂
        this.adapterFactory = getDownloadAdapterFactory();

        // 初始化临时文件管理器
        this.tempFileManager = new TempFileManager(AUDIO_DIR);

        // 初始化下载管理器
        this.downloadManager = new DownloadManager(AUDIO_DIR, this.tempFileManager);

        // 初始化临时目录
        this.tempFileManager.initialize().catch(error => {
            console.error('临时文件管理器初始化失败:', error);
        });

        // 启动定时清理任务（每分钟清理一次过期任务）
        this.startCleanupTimer();
    }

    /**
     * 获取 B 站视频信息（包括分P列表）
     *
     * @param url - B 站视频 URL 或 ID
     * @returns Promise<视频信息>
     * @throws Error - 当 URL 无效或获取失败时抛出
     */
    async getVideoInfo(url: string): Promise<BBDownVideoInfo> {
        try {
            // 获取 Bilibili 适配器
            const adapter = this.adapterFactory.getAdapter(DownloadPlatform.BILIBILI);

            // 获取视频信息
            const videoInfo = await this.downloadManager.getVideoInfo(adapter, url);

            // 转换为 BBDownVideoInfo 格式（向后兼容）
            return {
                bvid: videoInfo.id,
                title: videoInfo.title,
                author: videoInfo.author,
                isMultiPage: videoInfo.isMultiPart,
                pages: videoInfo.parts.map(part => ({
                    index: part.index,
                    title: part.title,
                    duration: part.duration
                }))
            };
        } catch (error) {
            console.error('获取视频信息失败:', error);
            throw error;
        }
    }

    /**
     * 下载 B 站视频并提取音频
     *
     * 工作流程:
     * 1. 验证请求参数
     * 2. 获取 Bilibili 适配器
     * 3. 调用下载管理器下载到临时目录
     * 4. 移动文件到目标播客目录
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

        try {
            // 1. 获取 Bilibili 适配器
            const adapter = this.adapterFactory.getAdapter(DownloadPlatform.BILIBILI);

            // 2. 验证适配器可用性
            const isAvailable = await adapter.checkAvailability();
            if (!isAvailable) {
                throw new Error('BBDown 工具不可用，请确保已正确安装');
            }

            // 3. 确定目标播客名称
            let targetPodcastName: string;

            if (podcastName) {
                targetPodcastName = podcastName;
            } else if (autoCreatePodcast) {
                // 自动创建播客：先获取视频信息，从视频标题生成播客名
                const videoInfo = await this.getVideoInfo(url);
                targetPodcastName = this.sanitizePodcastName(videoInfo.title);
            } else {
                throw new Error('未指定播客名称，且 autoCreatePodcast 为 false');
            }

            // 4. 转换分P选择格式
            let selectedParts: number[] | undefined;
            if (selectPage) {
                if (selectPage === 'ALL') {
                    // 如果是 ALL，不传 selectedParts，让适配器下载全部
                    selectedParts = undefined;
                } else {
                    // 解析逗号分隔的页码: "1,2,3" => [1, 2, 3]
                    selectedParts = selectPage.split(',').map(p => parseInt(p.trim(), 10));
                }
            }

            console.log(`开始下载 B 站视频: ${url}`);
            console.log(`目标播客: ${targetPodcastName}`);
            console.log(`剧集标题: ${episodeTitle || '使用视频标题'}`);
            if (selectedParts) {
                console.log(`选择分P: ${selectedParts.join(', ')}`);
            }

            // 5. 调用下载管理器下载
            const downloadResult = await this.downloadManager.downloadToPodcast(adapter, {
                url,
                podcastName: targetPodcastName,
                episodeTitle,
                selectedParts
            });

            if (!downloadResult.success || downloadResult.filePaths.length === 0) {
                throw new Error(downloadResult.error || '下载失败，未找到任何文件');
            }

            // 6. 构建返回结果（兼容旧格式）
            // 注意：新的下载管理器可能返回多个文件，但旧接口只返回一个
            // 这里返回第一个文件，实际上多P下载会有多个文件
            const firstFilePath = path.join(AUDIO_DIR, downloadResult.filePaths[0]);
            const fileName = path.basename(firstFilePath);

            const result: BilibiliDownloadResult = {
                success: true,
                filePath: firstFilePath,
                fileName,
                podcastName: targetPodcastName,
                episodeTitle: episodeTitle || downloadResult.videoInfo?.title || 'Unknown',
                videoInfo: {
                    bvid: downloadResult.videoInfo?.id || '',
                    title: downloadResult.videoInfo?.title || ''
                }
            };

            console.log(`下载完成: ${fileName}（共 ${downloadResult.filePaths.length} 个文件）`);
            return result;

        } catch (error) {
            console.error('下载失败:', error);
            throw error;
        }
    }

    /**
     * 清理播客名称，移除不合法的文件系统字符
     *
     * @param name - 原始名称
     * @returns 清理后的名称
     * @private
     */
    private sanitizePodcastName(name: string): string {
        return name
            .replace(/[<>:"/\\|?*]/g, '')  // 移除非法字符
            .replace(/\s+/g, ' ')           // 合并多个空格
            .trim()
            .substring(0, 50)               // 限制长度
            || 'bilibili-podcast';          // 如果为空，使用默认名称
    }

    /**
     * 启动下载任务（异步执行，立即返回 taskId）
     *
     * @param request - 下载请求参数
     * @returns Promise<taskId>
     */
    async startDownload(request: BilibiliDownloadRequest): Promise<string> {
        const {
            url,
            podcastName,
            episodeTitle,
            autoCreatePodcast = true,
            selectPage
        } = request;

        // 1. 生成唯一任务 ID
        const taskId = uuidv4();

        // 2. 确定目标播客名称（需要同步执行）
        let targetPodcastName: string;

        try {
            // 获取 Bilibili 适配器
            const adapter = this.adapterFactory.getAdapter(DownloadPlatform.BILIBILI);

            // 验证适配器可用性
            const isAvailable = await adapter.checkAvailability();
            if (!isAvailable) {
                throw new Error('BBDown 工具不可用，请确保已正确安装');
            }

            if (podcastName) {
                targetPodcastName = podcastName;
            } else if (autoCreatePodcast) {
                // 自动创建播客：先获取视频信息，从视频标题生成播客名
                const videoInfo = await this.getVideoInfo(url);
                targetPodcastName = this.sanitizePodcastName(videoInfo.title);
            } else {
                throw new Error('未指定播客名称，且 autoCreatePodcast 为 false');
            }

            // 3. 创建初始任务进度
            const now = Date.now();
            const initialProgress: TaskProgress = {
                taskId,
                status: 'pending',
                percent: 0,
                speed: '0 KB/s',
                eta: '计算中...',
                current: 0,
                total: 1,
                url,
                podcastName: targetPodcastName,
                episodeTitle,
                createdAt: now,
                updatedAt: now
            };

            this.taskProgressMap.set(taskId, initialProgress);

            // 4. 异步执行下载（不等待完成）
            this.executeDownload(taskId, request, targetPodcastName).catch(error => {
                console.error(`任务 ${taskId} 执行失败:`, error);
                this.updateTaskProgress(taskId, {
                    status: 'failed',
                    error: error.message || '下载失败'
                });
            });

            // 5. 立即返回 taskId
            return taskId;

        } catch (error) {
            // 如果初始化阶段就失败，创建一个失败的任务记录
            const now = Date.now();
            const failedProgress: TaskProgress = {
                taskId,
                status: 'failed',
                percent: 0,
                speed: '0 KB/s',
                eta: '-',
                current: 0,
                total: 1,
                url,
                podcastName: podcastName || 'Unknown',
                episodeTitle,
                error: error instanceof Error ? error.message : String(error),
                createdAt: now,
                updatedAt: now
            };

            this.taskProgressMap.set(taskId, failedProgress);
            return taskId;
        }
    }

    /**
     * 执行实际下载任务（私有方法）
     *
     * @param taskId - 任务 ID
     * @param request - 下载请求
     * @param targetPodcastName - 目标播客名称
     */
    private async executeDownload(
        taskId: string,
        request: BilibiliDownloadRequest,
        targetPodcastName: string
    ): Promise<void> {
        const { url, episodeTitle, selectPage } = request;

        try {
            // 更新状态为下载中
            this.updateTaskProgress(taskId, { status: 'downloading', percent: 10 });

            // 获取适配器
            const adapter = this.adapterFactory.getAdapter(DownloadPlatform.BILIBILI);

            // 转换分P选择格式
            let selectedParts: number[] | undefined;
            if (selectPage) {
                if (selectPage === 'ALL') {
                    selectedParts = undefined;
                } else {
                    selectedParts = selectPage.split(',').map(p => parseInt(p.trim(), 10));
                }
            }

            console.log(`[任务 ${taskId}] 开始下载: ${url}`);
            console.log(`[任务 ${taskId}] 目标播客: ${targetPodcastName}`);

            // 更新进度
            this.updateTaskProgress(taskId, { percent: 30 });

            // 调用下载管理器下载
            const downloadResult = await this.downloadManager.downloadToPodcast(adapter, {
                url,
                podcastName: targetPodcastName,
                episodeTitle,
                selectedParts
            });

            if (!downloadResult.success || downloadResult.filePaths.length === 0) {
                throw new Error(downloadResult.error || '下载失败，未找到任何文件');
            }

            // 更新进度为完成
            const fileName = downloadResult.filePaths.map(p => path.basename(p)).join(', ');
            this.updateTaskProgress(taskId, {
                status: 'completed',
                percent: 100,
                current: downloadResult.filePaths.length,
                total: downloadResult.filePaths.length,
                fileName,
                filePaths: downloadResult.filePaths,
                speed: '-',
                eta: '-'
            });

            console.log(`[任务 ${taskId}] 下载完成: ${fileName}`);

        } catch (error) {
            console.error(`[任务 ${taskId}] 下载失败:`, error);
            this.updateTaskProgress(taskId, {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * 获取任务进度
     *
     * @param taskId - 任务 ID
     * @returns 任务进度信息，如果任务不存在返回 null
     */
    getTaskProgress(taskId: string): TaskProgress | null {
        return this.taskProgressMap.get(taskId) || null;
    }

    /**
     * 获取所有任务（用于调试）
     *
     * @returns 所有任务的数组
     */
    getAllTasks(): TaskProgress[] {
        return Array.from(this.taskProgressMap.values());
    }

    /**
     * 更新任务进度（私有辅助方法）
     *
     * @param taskId - 任务 ID
     * @param updates - 要更新的字段
     */
    private updateTaskProgress(taskId: string, updates: Partial<TaskProgress>): void {
        const current = this.taskProgressMap.get(taskId);
        if (!current) {
            console.warn(`任务 ${taskId} 不存在，无法更新进度`);
            return;
        }

        const updated: TaskProgress = {
            ...current,
            ...updates,
            updatedAt: Date.now()
        };

        this.taskProgressMap.set(taskId, updated);
    }

    /**
     * 启动定时清理任务
     */
    private startCleanupTimer(): void {
        // 每分钟执行一次清理
        this.cleanupTimer = setInterval(() => {
            this.cleanOldTasks();
        }, 60 * 1000);
    }

    /**
     * 清理超过5分钟的已完成/失败任务
     */
    private cleanOldTasks(): void {
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        let cleaned = 0;
        for (const [taskId, task] of this.taskProgressMap.entries()) {
            // 只清理已完成或失败的任务
            if (task.status === 'completed' || task.status === 'failed') {
                const age = now - task.updatedAt;
                if (age > FIVE_MINUTES) {
                    this.taskProgressMap.delete(taskId);
                    cleaned++;
                }
            }
        }

        if (cleaned > 0) {
            console.log(`清理了 ${cleaned} 个过期任务`);
        }
    }

    /**
     * 停止清理定时器（用于测试或服务关闭）
     */
    stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}
