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

/**
 * B 站视频下载请求参数
 */
export interface BilibiliDownloadRequest {
    url: string;                    // B 站视频链接或 BV 号
    podcastName?: string;           // 目标播客目录名（可选）
    episodeTitle?: string;          // 自定义剧集标题（可选）
    autoCreatePodcast?: boolean;    // 是否自动创建播客（默认 true）
}

/**
 * B 站视频信息
 */
export interface BilibiliVideoInfo {
    bvid: string;                   // B 站视频 BV 号
    title: string;                  // 原始视频标题
}

/**
 * B 站视频下载结果
 */
export interface BilibiliDownloadResult {
    success: boolean;               // 是否下载成功
    filePath: string;               // 下载的文件完整路径
    fileName: string;               // 文件名
    podcastName: string;            // 所属播客名称
    episodeTitle: string;           // 剧集标题
    videoInfo: BilibiliVideoInfo;   // 视频信息
}