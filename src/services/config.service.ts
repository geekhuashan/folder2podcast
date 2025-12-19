import fs from 'fs-extra';
import path from 'path';
import {
    PodcastConfig,
    PodcastConfigV2,
    PodcastConfigV2Full,
    EpisodeNumberStrategy
} from '../types';
import { getEnvConfig } from '../utils/env';

export class ConfigService {
    private readonly DEFAULT_CONFIG: PodcastConfigV2Full = {
        // metadata 字段
        title: '',
        description: '',
        author: 'Unknown',
        language: 'zh-cn',
        category: 'Podcast',
        explicit: false,
        email: '',
        websiteUrl: '',
        // parsing 字段
        titleFormat: getEnvConfig().TITLE_FORMAT,
        episodeNumberStrategy: 'prefix',
        useMTime: false
    };

    /**
     * 读取播客配置文件
     * @param dirPath 播客目录路径
     * @returns 配置对象(V2格式,包含默认值)
     */
    async readConfig(dirPath: string): Promise<PodcastConfigV2Full> {
        const configPath = path.join(dirPath, 'podcast.json');
        let rawConfig: any = {};

        try {
            rawConfig = await fs.readJSON(configPath);
        } catch {
            // 配置文件不存在或无法读取,使用默认配置
            console.log(`No config file found at ${configPath}, using defaults`);
        }

        // 检测并迁移 V1 格式
        const v2Config = this.migrateIfNeeded(rawConfig);

        // 验证配置
        this.validateConfig(v2Config);

        // 合并默认值并扁平化
        return this.mergeWithDefaults(dirPath, v2Config);
    }

    /**
     * 验证配置有效性
     * @param config V2 配置对象
     */
    validateConfig(config: PodcastConfigV2): void {
        const metadata = config.metadata || {};
        const parsing = config.parsing || {};

        // 验证邮箱格式
        if (metadata.email && !metadata.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            throw new Error('Invalid email format in podcast.json');
        }

        // 验证网址格式
        if (metadata.websiteUrl && !metadata.websiteUrl.match(/^https?:\/\/.+/)) {
            throw new Error('Invalid website URL format in podcast.json');
        }

        // 验证剧集序号策略
        if (parsing.episodeNumberStrategy) {
            this.validateEpisodeNumberStrategy(parsing.episodeNumberStrategy);
        }
    }

    /**
     * 检测并迁移 V1 配置格式到 V2
     * @param rawConfig 原始配置对象
     * @returns V2 格式配置
     */
    private migrateIfNeeded(rawConfig: any): PodcastConfigV2 {
        // 如果已经是 V2 格式(包含 metadata 或 parsing 字段),直接返回
        if (rawConfig.metadata || rawConfig.parsing) {
            return rawConfig as PodcastConfigV2;
        }

        // 检查是否有任何 V1 字段
        const v1Fields = [
            'title', 'description', 'author', 'language', 'category',
            'explicit', 'email', 'websiteUrl', 'titleFormat',
            'episodeNumberStrategy', 'useMTime'
        ];

        const hasV1Fields = v1Fields.some(field => field in rawConfig);

        if (!hasV1Fields) {
            // 空配置,返回空 V2 对象
            return {};
        }

        // 进行迁移
        console.log('Detected V1 config format, migrating to V2...');
        return this.migrateV1ToV2(rawConfig);
    }

    /**
     * 迁移 V1 配置到 V2 格式
     * @param v1Config V1 格式配置
     * @returns V2 格式配置
     */
    private migrateV1ToV2(v1Config: PodcastConfig): PodcastConfigV2 {
        const v2Config: PodcastConfigV2 = {
            metadata: {},
            parsing: {}
        };

        // 映射 metadata 字段
        if (v1Config.title !== undefined) v2Config.metadata!.title = v1Config.title;
        if (v1Config.description !== undefined) v2Config.metadata!.description = v1Config.description;
        if (v1Config.author !== undefined) v2Config.metadata!.author = v1Config.author;
        if (v1Config.language !== undefined) v2Config.metadata!.language = v1Config.language;
        if (v1Config.category !== undefined) v2Config.metadata!.category = v1Config.category;
        if (v1Config.explicit !== undefined) v2Config.metadata!.explicit = v1Config.explicit;
        if (v1Config.email !== undefined) v2Config.metadata!.email = v1Config.email;
        if (v1Config.websiteUrl !== undefined) v2Config.metadata!.websiteUrl = v1Config.websiteUrl;

        // 映射 parsing 字段
        if (v1Config.titleFormat !== undefined) v2Config.parsing!.titleFormat = v1Config.titleFormat;
        if (v1Config.episodeNumberStrategy !== undefined) v2Config.parsing!.episodeNumberStrategy = v1Config.episodeNumberStrategy;
        if (v1Config.useMTime !== undefined) v2Config.parsing!.useMTime = v1Config.useMTime;

        return v2Config;
    }

    /**
     * 合并默认值并扁平化配置
     * @param dirPath 播客目录路径
     * @param config V2 配置对象
     * @returns 扁平化的完整配置
     */
    private mergeWithDefaults(dirPath: string, config: PodcastConfigV2): PodcastConfigV2Full {
        const dirName = path.basename(dirPath);
        const metadata = config.metadata || {};
        const parsing = config.parsing || {};

        return {
            // metadata 字段
            title: metadata.title || this.DEFAULT_CONFIG.title || dirName,
            description: metadata.description || this.DEFAULT_CONFIG.description || dirName,
            author: metadata.author || this.DEFAULT_CONFIG.author,
            language: metadata.language || this.DEFAULT_CONFIG.language,
            category: metadata.category || this.DEFAULT_CONFIG.category,
            explicit: metadata.explicit !== undefined ? metadata.explicit : this.DEFAULT_CONFIG.explicit,
            email: metadata.email || this.DEFAULT_CONFIG.email,
            websiteUrl: metadata.websiteUrl || this.DEFAULT_CONFIG.websiteUrl,
            // parsing 字段
            titleFormat: parsing.titleFormat || this.DEFAULT_CONFIG.titleFormat,
            episodeNumberStrategy: parsing.episodeNumberStrategy || this.DEFAULT_CONFIG.episodeNumberStrategy,
            useMTime: parsing.useMTime !== undefined ? parsing.useMTime : this.DEFAULT_CONFIG.useMTime
        };
    }

    /**
     * 验证剧集序号提取策略
     * @param strategy 序号提取策略
     */
    private validateEpisodeNumberStrategy(strategy: EpisodeNumberStrategy): void {
        if (typeof strategy === 'string') {
            if (!['prefix', 'suffix', 'first', 'last'].includes(strategy)) {
                throw new Error(
                    'Invalid episode number strategy. Must be one of: prefix, suffix, first, last'
                );
            }
        } else if (typeof strategy === 'object') {
            if (!strategy.pattern) {
                throw new Error('Custom pattern strategy requires a pattern property');
            }

            try {
                new RegExp(strategy.pattern);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    throw new Error(`Invalid regex pattern: ${error.message}`);
                }
                throw new Error('Invalid regex pattern');
            }
        } else {
            throw new Error('Invalid episode number strategy configuration');
        }
    }
}
