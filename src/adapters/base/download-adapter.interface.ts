/**
 * 视频分P/分集信息
 */
export interface VideoPartInfo {
    /** 序号（从1开始） */
    index: number;
    /** 标题 */
    title: string;
    /** 时长（秒，可选） */
    duration?: number;
    /** 分P唯一ID（可选） */
    id?: string;
}

/**
 * 平台枚举
 */
export enum DownloadPlatform {
    BILIBILI = 'bilibili',
    DOUYIN = 'douyin',
    XIGUA = 'xigua',
    YOUTUBE = 'youtube'
}

/**
 * 视频信息接口（统一格式）
 */
export interface VideoInfo {
    /** 视频ID（平台唯一标识） */
    id: string;
    /** 视频标题 */
    title: string;
    /** 作者/UP主 */
    author?: string;
    /** 时长（秒，可选） */
    duration?: number;
    /** 是否为多分P/多集 */
    isMultiPart: boolean;
    /** 分P/分集信息 */
    parts: VideoPartInfo[];
    /** 缩略图URL（可选） */
    thumbnail?: string;
    /** 平台标识 */
    platform: DownloadPlatform;

    // 平台特定的额外元数据（可选）
    /** 发布日期（ISO 8601 格式） */
    publishDate?: string;
    /** 创作者昵称 */
    ownerName?: string;
    /** 创作者ID */
    ownerMid?: string;
    /** 视频描述 */
    description?: string;
}

/**
 * 下载选项
 */
export interface DownloadOptions {
    /** 视频URL或ID */
    url: string;
    /** 输出目录（临时目录） */
    outputDir: string;
    /** 文件命名模板（可选） */
    fileNamePattern?: string;
    /** 选中的分P索引（可选，undefined表示全部） */
    selectedParts?: number[];
    /** 仅下载音频（默认 true） */
    audioOnly?: boolean;
    /** 质量选项（可选） */
    quality?: string;
}

/**
 * 下载结果
 */
export interface DownloadResult {
    /** 是否成功 */
    success: boolean;
    /** 下载的文件路径列表 */
    filePaths: string[];
    /** 视频信息 */
    videoInfo: VideoInfo;
    /** 错误信息（失败时） */
    error?: string;
}

/**
 * 下载适配器接口
 *
 * 所有平台的下载适配器必须实现此接口
 */
export interface IDownloadAdapter {
    /**
     * 平台标识
     */
    readonly platform: DownloadPlatform;

    /**
     * 验证URL是否有效
     * @param url - 待验证的URL
     * @returns 是否为有效URL
     */
    isValidUrl(url: string): boolean;

    /**
     * 从URL中提取视频ID
     * @param url - 视频URL
     * @returns 视频ID，提取失败返回 null
     */
    extractVideoId(url: string): string | null;

    /**
     * 获取视频信息（包括分P列表）
     * @param url - 视频URL或ID
     * @returns Promise<视频信息>
     * @throws Error - 当URL无效或获取失败时抛出
     */
    getVideoInfo(url: string): Promise<VideoInfo>;

    /**
     * 下载视频/音频
     * @param options - 下载选项
     * @returns Promise<下载结果>
     * @throws Error - 当下载失败时抛出
     */
    download(options: DownloadOptions): Promise<DownloadResult>;

    /**
     * 检查下载工具是否可用
     * @returns Promise<是否可用>
     */
    checkAvailability(): Promise<boolean>;

    /**
     * 下载视频封面图片（可选方法）
     *
     * @param url - 视频URL或ID
     * @param outputDir - 输出目录（绝对路径）
     * @param fileName - 封面文件名（不含扩展名）
     * @returns Promise<封面文件的绝对路径>，失败返回 null
     */
    downloadCover?(
        url: string,
        outputDir: string,
        fileName: string
    ): Promise<string | null>;
}
