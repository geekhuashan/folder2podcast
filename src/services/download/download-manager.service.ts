import path from 'path';
import fs from 'fs-extra';
import { IDownloadAdapter, AudioFile } from '../../adapters/base/download-adapter.interface';
import { TempFileManager } from './temp-file-manager.service';
import { EpisodeMetadata } from '../../types';
import { getStorage } from '../storage';
import type { IStorage } from '../storage';
import { insertEpisodeOnFileUpload } from '../podcast';

/**
 * 统一下载请求接口
 */
export interface UnifiedDownloadRequest {
    /** 视频 URL */
    url: string;
    /** 目标播客名称 */
    podcastName: string;
    /** 用户ID（用于多用户隔离） */
    userId: string;
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
    /** 错误信息 */
    error?: string;
}

/**
 * 下载管理器服务（重构版 - 支持 S3 存储）
 *
 * 职责简化：
 * - 协调适配器和临时文件管理器
 * - 实现统一的下载流程
 * - 处理文件从临时目录到播客目录的移动（支持本地和 S3）
 * - 保存适配器提供的元数据到 episodes.json
 *
 * 移除的职责：
 * - 不再下载封面（适配器已经下载）
 * - 不再提取元数据（适配器已经提取）
 * - 不再调用 EpisodeMetadataService（直接保存）
 */
export class DownloadManager {
    private readonly audioDir: string;
    private readonly tempFileManager: TempFileManager;
    private readonly storage: IStorage;

    constructor(audioDir: string, tempFileManager: TempFileManager, storage?: IStorage) {
        this.audioDir = audioDir;
        this.tempFileManager = tempFileManager;
        this.storage = storage || getStorage();
    }

    /**
     * 统一下载接口（重构版）
     *
     * 流程简化：
     * 1. 创建任务临时目录
     * 2. 调用适配器下载到临时目录（适配器返回完整的 AudioFile[]）
     * 3. 移动音频文件和封面到播客目录
     * 4. 保存元数据到 episodes.json
     * 5. 清理临时目录
     *
     * @param adapter - 下载适配器
     * @param request - 下载请求
     * @returns 下载结果
     */
    async downloadToPodcast(
        adapter: IDownloadAdapter,
        request: UnifiedDownloadRequest
    ): Promise<UnifiedDownloadResponse> {
        const { url, podcastName, userId, episodeTitle, fileNamePattern, selectedParts } = request;

        // 1. 创建任务临时目录
        const { taskId, tempDir } = await this.tempFileManager.createTaskTempDir();
        console.log(`[DownloadManager] 任务 ${taskId} 开始下载`);

        try {
            // 2. 调用适配器下载到临时目录
            console.log(`[DownloadManager] 使用 ${adapter.platform} 适配器下载...`);

            const downloadResult = await adapter.download({
                url,
                outputDir: tempDir,
                fileNamePattern: fileNamePattern || episodeTitle,
                selectedParts,
                quality: undefined
            });

            // 检查下载是否成功
            if (!downloadResult.success) {
                throw new Error(downloadResult.error || '下载失败');
            }

            if (downloadResult.audioFiles.length === 0) {
                throw new Error('下载完成，但没有找到任何文件');
            }

            console.log(`[DownloadManager] 下载完成，共 ${downloadResult.audioFiles.length} 个文件`);

            // 3. 准备目标播客目录（包含用户隔离）
            const podcastRelativePath = `audio/${userId}/${podcastName}`;
            await this.storage.ensureDirectory(podcastRelativePath);

            // 4. 移动文件到播客目录并保存元数据
            console.log(`[DownloadManager] 移动文件到播客目录: ${podcastName}`);

            const movedFilePaths: string[] = [];
            const episodesMetadata: Record<string, EpisodeMetadata> = {};

            for (const audioFile of downloadResult.audioFiles) {
                // 4.1 移动音频文件（从本地临时目录读取，上传到存储）
                const targetAudioPath = `${podcastRelativePath}/${audioFile.fileName}`;
                const audioBuffer = await fs.readFile(audioFile.filePath);
                await this.storage.saveFile(targetAudioPath, audioBuffer);
                movedFilePaths.push(targetAudioPath);

                // 4.2 移动封面文件（如果适配器下载了封面）
                let coverFileName: string | undefined;
                if (audioFile.coverPath) {
                    coverFileName = path.basename(audioFile.coverPath);
                    const targetCoverPath = `${podcastRelativePath}/${coverFileName}`;
                    const coverBuffer = await fs.readFile(audioFile.coverPath);
                    await this.storage.saveFile(targetCoverPath, coverBuffer);
                    console.log(`[DownloadManager] 封面已移动: ${coverFileName}`);
                }

                // ✅ 4.3 直接插入数据库（不再依赖 episodes.json）
                const podcastId = `${userId}:${podcastName}`;
                const fileStats = await fs.stat(audioFile.filePath);

                await insertEpisodeOnFileUpload({
                    podcastId,
                    fileName: audioFile.fileName,
                    fileSize: fileStats.size,
                    title: audioFile.title,
                    description: audioFile.description,
                    pubDate: audioFile.publishDate ? new Date(audioFile.publishDate) : undefined,
                    coverUrl: coverFileName,
                });

                // 4.4 构建剧集元数据（用于 episodes.json 备份）
                const metadata: EpisodeMetadata = {
                    title: audioFile.title,              // ✅ 适配器提供的标题
                    description: audioFile.description,  // ✅ 适配器提供的描述
                    image: coverFileName,                // ✅ 适配器下载的封面
                    pubDate: audioFile.publishDate       // ✅ 适配器提供的发布时间
                };

                // 移除 undefined 字段
                Object.keys(metadata).forEach(key => {
                    if (metadata[key as keyof EpisodeMetadata] === undefined) {
                        delete metadata[key as keyof EpisodeMetadata];
                    }
                });

                // 只有包含有效数据时才保存
                if (Object.keys(metadata).length > 0) {
                    episodesMetadata[audioFile.fileName] = metadata;
                }
            }

            // 5. 保存 episodes.json（一次性写入所有元数据）
            if (Object.keys(episodesMetadata).length > 0) {
                await this.saveEpisodesMetadata(podcastRelativePath, episodesMetadata);
                console.log(`[DownloadManager] 已保存 ${Object.keys(episodesMetadata).length} 个剧集的元数据`);
            }

            // 6. 清理临时目录
            await this.tempFileManager.cleanupTaskTempDir(taskId);

            console.log(`[DownloadManager] 任务 ${taskId} 完成`);

            // 返回相对路径（标准格式）
            const relativeFilePaths = movedFilePaths;

            return {
                success: true,
                filePaths: relativeFilePaths,
                podcastName
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
     * 保存剧集元数据到 episodes.json
     *
     * @param podcastRelativePath - 播客目录相对路径（如 audio/userId/podcastName）
     * @param newMetadata - 新的剧集元数据
     */
    private async saveEpisodesMetadata(
        podcastRelativePath: string,
        newMetadata: Record<string, EpisodeMetadata>
    ): Promise<void> {
        const episodesJsonPath = `${podcastRelativePath}/episodes.json`;

        // 读取现有的 episodes.json（如果存在）
        let existingConfig: { episodes: Record<string, EpisodeMetadata> } = { episodes: {} };

        if (await this.storage.fileExists(episodesJsonPath)) {
            try {
                const contentBuffer = await this.storage.readFile(episodesJsonPath);
                const content = contentBuffer.toString('utf-8');
                existingConfig = JSON.parse(content);
            } catch (error) {
                console.warn(`[DownloadManager] 读取 episodes.json 失败，将创建新文件:`, error);
            }
        }

        // 合并新旧元数据
        const mergedMetadata = {
            ...existingConfig.episodes,
            ...newMetadata
        };

        // 写入文件
        const config = {
            episodes: mergedMetadata
        };

        const configJson = JSON.stringify(config, null, 2);
        await this.storage.saveFile(episodesJsonPath, Buffer.from(configJson, 'utf-8'));
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

        // 检查适配器是否支持 getVideoInfo
        if (!adapter.getVideoInfo) {
            throw new Error(`适配器 ${adapter.platform} 不支持获取视频信息`);
        }

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
