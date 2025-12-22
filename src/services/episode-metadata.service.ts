import path from 'path';
import fs from 'fs-extra';
import { getEnvConfig } from '../utils/env';
import { IDownloadAdapter } from '../adapters/base/download-adapter.interface';
import { VideoInfo } from '../adapters/base/download-adapter.interface';
import { EpisodesConfig, EpisodeMetadata } from '../types';
import { generateEpisodeDescription } from '../adapters/bilibili/bbdown.utils';

/**
 * 剧集元数据服务
 *
 * 职责：
 * - 为下载的音频文件生成完整的元数据
 * - 下载剧集封面（如果适配器支持）
 * - 保存/更新 episodes.json 配置文件
 */
export class EpisodeMetadataService {
    private audioDir: string;

    constructor() {
        this.audioDir = getEnvConfig().AUDIO_DIR;
    }

    /**
     * 为下载的音频文件补充元数据
     *
     * @param podcastDir - 播客目录名（相对于 AUDIO_DIR）
     * @param audioFilePaths - 音频文件路径列表（相对于 AUDIO_DIR）
     * @param videoInfo - 视频信息（包含元数据）
     * @param adapter - 下载适配器
     * @param videoUrl - 视频URL（用于下载封面）
     */
    async enrichEpisodeMetadata(
        podcastDir: string,
        audioFilePaths: string[],
        videoInfo: VideoInfo,
        adapter: IDownloadAdapter,
        videoUrl: string
    ): Promise<void> {
        console.log(`[EpisodeMetadataService] 开始处理 ${audioFilePaths.length} 个剧集的元数据`);

        const podcastPath = path.join(this.audioDir, podcastDir);

        // 读取现有的 episodes.json
        let episodesConfig = await this.readEpisodesConfig(podcastPath);
        if (!episodesConfig) {
            episodesConfig = { episodes: {} };
        }

        // 为每个音频文件处理元数据
        for (const audioFilePath of audioFilePaths) {
            const audioFileName = path.basename(audioFilePath);
            const episodeBaseName = path.parse(audioFileName).name;

            // 生成元数据
            const metadata: EpisodeMetadata = this.generateMetadata(videoInfo);

            // 下载封面（如果适配器支持）
            if (adapter.downloadCover) {
                const coverFileName = await this.downloadEpisodeCover(
                    podcastPath,
                    episodeBaseName,
                    videoUrl,
                    adapter
                );

                if (coverFileName) {
                    metadata.image = coverFileName;
                }
            }

            // 保存到配置
            episodesConfig.episodes[audioFileName] = metadata;
        }

        // 写入 episodes.json
        await this.saveEpisodesConfig(podcastPath, episodesConfig);

        console.log(`[EpisodeMetadataService] 元数据处理完成`);
    }

    /**
     * 下载剧集封面
     */
    private async downloadEpisodeCover(
        podcastPath: string,
        episodeBaseName: string,
        videoUrl: string,
        adapter: IDownloadAdapter
    ): Promise<string | null> {
        try {
            if (!adapter.downloadCover) {
                return null;
            }

            const coverPath = await adapter.downloadCover(
                videoUrl,
                podcastPath,
                episodeBaseName
            );

            if (!coverPath) {
                return null;
            }

            // 返回相对文件名（相对于播客目录）
            return path.basename(coverPath);

        } catch (error) {
            console.warn(`下载剧集封面失败: ${error}`);
            return null;
        }
    }

    /**
     * 生成剧集元数据
     */
    private generateMetadata(videoInfo: VideoInfo): EpisodeMetadata {
        const metadata: EpisodeMetadata = {};

        // 生成描述
        if (videoInfo.id || videoInfo.ownerMid || videoInfo.publishDate) {
            metadata.description = generateEpisodeDescription(videoInfo);
        }

        // 设置发布日期
        if (videoInfo.publishDate) {
            metadata.pubDate = videoInfo.publishDate;
        }

        return metadata;
    }

    /**
     * 读取 episodes.json
     */
    private async readEpisodesConfig(podcastPath: string): Promise<EpisodesConfig | null> {
        const configPath = path.join(podcastPath, 'episodes.json');

        try {
            if (!await fs.pathExists(configPath)) {
                return null;
            }

            const content = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn(`读取 episodes.json 失败: ${error}`);
            return null;
        }
    }

    /**
     * 保存 episodes.json
     */
    private async saveEpisodesConfig(
        podcastPath: string,
        config: EpisodesConfig
    ): Promise<void> {
        const configPath = path.join(podcastPath, 'episodes.json');

        try {
            await fs.writeFile(
                configPath,
                JSON.stringify(config, null, 2),
                'utf-8'
            );
            console.log(`已保存 episodes.json: ${configPath}`);
        } catch (error) {
            console.error(`保存 episodes.json 失败: ${error}`);
            throw error;
        }
    }
}
