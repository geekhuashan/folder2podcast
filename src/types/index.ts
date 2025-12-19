export interface Episode {
    number: number;
    title: string;
    fileName: string;
    filePath: string;
    pubDate: Date;
}

export type EpisodeNumberStrategy =
    | 'prefix'          // 默认：从文件名开头匹配数字
    | 'suffix'          // 默认：从文件名末尾匹配数字
    | 'first'           // 配置：从左到右找第一个数字
    | 'last'            // 配置：从右到左找最后一个数字
    | 'date'            // 配置：自动识别日期格式（YYYY-MM-DD, YYYYMMDD等）
    | { pattern: string }; // 配置：使用自定义正则表达式

export interface PodcastConfig {
    title?: string;
    description?: string;
    author?: string;
    language?: string;
    category?: string;
    explicit?: boolean;
    email?: string;
    websiteUrl?: string;
    episodeNumberStrategy?: EpisodeNumberStrategy;  // 可选：序号提取策略
    useMTime?: boolean;  // 是否使用文件的创建时间作为发布时间
}

export interface PodcastSource {
    dirName: string;
    dirPath: string;
    config: Required<PodcastConfig>;
    episodes: Episode[];
    coverPath?: string;
}

// V2 版本的 PodcastSource (使用 V2 配置)
export interface PodcastSourceV2 {
    dirName: string;
    dirPath: string;
    config: PodcastConfigV2Full;
    episodes: Episode[];
    coverPath?: string;
}

export interface ProcessOptions {
    baseUrl: string;
    defaultCover: string;
}

// V2 配置格式: metadata 和 parsing 分组
export interface PodcastMetadata {
    title?: string;
    description?: string;
    author?: string;
    language?: string;
    category?: string;
    explicit?: boolean;
    email?: string;
    websiteUrl?: string;
}

export interface PodcastParsingOptions {
    episodeNumberStrategy?: EpisodeNumberStrategy;
    useMTime?: boolean;
}

export interface PodcastConfigV2 {
    metadata?: PodcastMetadata;
    parsing?: PodcastParsingOptions;
}

// V2 内部使用的完整配置(扁平化,包含所有字段和默认值)
export interface PodcastConfigV2Full {
    // metadata 字段
    title: string;
    description: string;
    author: string;
    language: string;
    category: string;
    explicit: boolean;
    email: string;
    websiteUrl: string;
    // parsing 字段
    episodeNumberStrategy: EpisodeNumberStrategy;
    useMTime: boolean;
}