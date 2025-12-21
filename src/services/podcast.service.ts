import fs from 'fs-extra';
import path from 'path';
import { Episode, PodcastSourceV2, PodcastConfigV2Full, EpisodesConfig, EpisodeMetadata } from '../types';
import { ConfigService } from './config.service';
import { createEpisode, validateFileName, parseEpisodeNumber } from '../utils/episode';
import { getEnvConfig } from '../utils/env';

export class PodcastService {
    private configService: ConfigService;

    constructor() {
        this.configService = new ConfigService();
    }

    /**
     * 扫描单个播客目录
     * @param dirPath 播客目录路径
     * @returns 播客源数据
     */
    async scanPodcast(dirPath: string): Promise<PodcastSourceV2> {
        // 验证目录存在
        if (!await fs.pathExists(dirPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        // 读取和验证配置
        const config = await this.configService.readConfig(dirPath);

        // 扫描音频文件
        const episodes = await this.scanAudioFiles(dirPath, config);

        // 读取剧集元数据配置（如果存在）
        const episodesConfig = await this.readEpisodesConfig(dirPath);

        // 应用剧集元数据
        const episodesWithMetadata = await this.applyEpisodesMetadata(
            episodes,
            episodesConfig,
            dirPath
        );

        // 排序剧集
        const sortedEpisodes = this.sortEpisodes(episodesWithMetadata, config);

        // 查找封面
        const coverPath = await this.findCover(dirPath);

        return {
            dirName: path.basename(dirPath),
            dirPath,
            config,
            episodes: sortedEpisodes,
            coverPath
        };
    }

    /**
     * 扫描所有播客
     * @returns 所有播客的源数据数组
     */
    async scanAllPodcasts(): Promise<PodcastSourceV2[]> {
        const audioDir = getEnvConfig().AUDIO_DIR;

        if (!await fs.pathExists(audioDir)) {
            throw new Error(`Audio directory not found: ${audioDir}`);
        }

        const entries = await fs.readdir(audioDir, { withFileTypes: true });
        const podcasts: PodcastSourceV2[] = [];

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            // 跳过隐藏目录
            if (entry.name.startsWith('.')) continue;

            try {
                const podcastPath = path.join(audioDir, entry.name);
                const podcast = await this.scanPodcast(podcastPath);
                podcasts.push(podcast);
            } catch (error) {
                console.warn(`Failed to scan podcast ${entry.name}:`, error);
            }
        }

        return podcasts;
    }

    /**
     * 扫描音频文件（仅扫描根目录）
     * @param dirPath 目录路径
     * @param config 播客配置
     * @returns 剧集数组
     */
    private async scanAudioFiles(dirPath: string, config: PodcastConfigV2Full): Promise<Episode[]> {
        const episodes: Episode[] = [];

        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            // 跳过隐藏文件和目录
            if (entry.name.startsWith('.')) {
                continue;
            }

            // 只处理文件，忽略子目录
            if (!entry.isFile()) {
                continue;
            }

            // 验证文件名
            if (!validateFileName(entry.name)) {
                continue;
            }

            try {
                // 将 V2 配置转换为 episode.ts 需要的格式
                const episodeConfig = {
                    episodeNumberStrategy: config.episodeNumberStrategy,
                    useMTime: config.useMTime
                };

                // 创建剧集对象
                const episode = createEpisode(entry.name, dirPath, episodeConfig);

                episodes.push(episode);
            } catch (error) {
                console.warn(`Skipping invalid file: ${entry.name}`, error);
            }
        }

        return episodes;
    }

    /**
     * 排序剧集
     * @param episodes 剧集数组
     * @param config 播客配置
     * @returns 排序后的剧集数组
     */
    private sortEpisodes(episodes: Episode[], config: PodcastConfigV2Full): Episode[] {
        // 创建一个 Map 来缓存文件名的序号解析结果
        const numberCache = new Map<string, number | null>();

        // 首先解析并缓存所有文件的序号
        const episodeConfig = {
            episodeNumberStrategy: config.episodeNumberStrategy
        };

        episodes.forEach(episode => {
            numberCache.set(episode.fileName, parseEpisodeNumber(episode.fileName, episodeConfig));
        });

        // 分离有序号和无序号文件
        const numberedEpisodes = episodes.filter(e => numberCache.get(e.fileName) !== null);
        const unnumberedEpisodes = episodes.filter(e => numberCache.get(e.fileName) === null);

        // 如果全是无序号文件,直接按时间排序
        if (numberedEpisodes.length === 0) {
            return [...episodes].sort((a, b) => a.pubDate.getTime() - b.pubDate.getTime());
        }

        // 有序号的按序号排序
        numberedEpisodes.sort((a, b) => {
            const aNumber = numberCache.get(a.fileName);
            const bNumber = numberCache.get(b.fileName);
            return (aNumber || 0) - (bNumber || 0);
        });

        // 无序号的按时间排序
        unnumberedEpisodes.sort((a, b) => a.pubDate.getTime() - b.pubDate.getTime());

        // 合并:有序号的在前,无序号的在后
        return [...numberedEpisodes, ...unnumberedEpisodes];
    }

    /**
     * 查找封面文件
     * @param dirPath 目录路径
     * @returns 封面路径,如果不存在返回 undefined
     */
    private async findCover(dirPath: string): Promise<string | undefined> {
        const coverExtensions = ['jpg', 'jpeg', 'png'];

        for (const ext of coverExtensions) {
            const coverPath = path.join(dirPath, `cover.${ext}`);
            if (await fs.pathExists(coverPath)) {
                return coverPath;
            }
        }

        return undefined;
    }

    /**
     * 读取剧集元数据配置文件
     * @param dirPath 播客目录路径
     * @returns 剧集配置对象，如果文件不存在则返回 null
     */
    private async readEpisodesConfig(dirPath: string): Promise<EpisodesConfig | null> {
        const configPath = path.join(dirPath, 'episodes.json');

        try {
            // 检查文件是否存在
            if (!await fs.pathExists(configPath)) {
                return null;
            }

            // 读取并解析配置文件
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content) as EpisodesConfig;

            return config;
        } catch (error) {
            console.warn(`Failed to read episodes.json in ${dirPath}:`, error);
            return null;
        }
    }

    /**
     * 应用剧集元数据到剧集数组
     * @param episodes 原始剧集数组
     * @param episodesConfig 剧集元数据配置
     * @param dirPath 播客目录路径
     * @returns 应用元数据后的剧集数组
     */
    private async applyEpisodesMetadata(
        episodes: Episode[],
        episodesConfig: EpisodesConfig | null,
        dirPath: string
    ): Promise<Episode[]> {
        // 如果没有配置，直接返回原始剧集
        if (!episodesConfig || !episodesConfig.episodes) {
            return episodes;
        }

        const { BASE_URL } = getEnvConfig();
        const dirName = path.basename(dirPath);

        // 为每个剧集应用元数据
        return episodes.map(episode => {
            const metadata = episodesConfig.episodes[episode.fileName];

            // 如果没有该剧集的元数据，返回原始剧集
            if (!metadata) {
                return episode;
            }

            // 应用元数据（优先使用配置的值）
            const updatedEpisode: Episode = { ...episode };

            // 应用自定义标题
            if (metadata.title) {
                updatedEpisode.title = metadata.title;
            }

            // 应用描述
            if (metadata.description) {
                updatedEpisode.description = metadata.description;
            }

            // 应用自定义发布时间
            if (metadata.pubDate) {
                try {
                    updatedEpisode.pubDate = new Date(metadata.pubDate);
                } catch (error) {
                    console.warn(`Invalid pubDate for ${episode.fileName}:`, metadata.pubDate);
                }
            }

            // 应用剧集封面
            if (metadata.image) {
                updatedEpisode.imageUrl = `${BASE_URL}/audio/${encodeURIComponent(dirName)}/${encodeURIComponent(metadata.image)}`;
            }

            return updatedEpisode;
        });
    }
}
