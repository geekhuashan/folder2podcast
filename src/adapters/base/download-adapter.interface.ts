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
    /** 质量选项（可选） */
    quality?: string;
}

/**
 * 单个音频文件的完整信息
 *
 * 适配器能提供什么就填充什么，不能提供就留 undefined
 * 服务层会直接使用这些数据，无需额外判断和转换
 */
export interface AudioFile {
    /** 文件路径（必须） */
    filePath: string;

    /** 文件名（必须） */
    fileName: string;

    // ===== 以下字段可选，适配器尽力填充 =====

    /** 剧集标题（如果适配器能提取） */
    title?: string;

    /** 剧集描述（如果适配器能提取） */
    description?: string;

    /** 封面文件路径（如果适配器下载了封面） */
    coverPath?: string;

    /** 发布时间（ISO 8601 格式，如果适配器能获取） */
    publishDate?: string;

    /** 时长（秒，如果适配器能获取） */
    duration?: number;

    /** 作者/UP主（如果适配器能获取） */
    author?: string;

    /** 视频ID（用于生成描述等） */
    videoId?: string;

    /** 分P索引（多P视频时，从1开始） */
    partIndex?: number;
}

/**
 * 下载结果 - 包含所有适配器能提供的信息
 */
export interface DownloadResult {
    /** 是否成功 */
    success: boolean;

    /** 下载的音频文件列表（包含完整元数据） */
    audioFiles: AudioFile[];

    /** 错误信息（失败时） */
    error?: string;
}

/**
 * 视频分P/分集信息（内部使用）
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
 * 视频信息接口（适配器内部使用）
 *
 * 用于适配器在下载前获取视频信息，然后填充到 AudioFile 中
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
 * 下载适配器接口
 *
 * 核心设计理念：
 * - download() 方法返回的 AudioFile[] 应该包含适配器能提供的所有信息
 * - 适配器能提供什么就填充什么（标题、描述、封面、发布时间等）
 * - 服务层直接使用这些数据，无需额外判断和转换
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
     * 下载音频并返回完整的文件信息（核心方法）
     *
     * 适配器应该：
     * 1. 下载音频文件到 outputDir
     * 2. 尽可能下载封面（如果支持）
     * 3. 提取视频信息（标题、描述、发布时间等）
     * 4. 返回包含完整元数据的 AudioFile[]
     *
     * @param options - 下载选项
     * @returns Promise<下载结果，包含完整元数据>
     */
    download(options: DownloadOptions): Promise<DownloadResult>;

    /**
     * 检查下载工具是否可用
     * @returns Promise<是否可用>
     */
    checkAvailability(): Promise<boolean>;

    /**
     * 获取视频信息（可选方法，仅用于预览）
     *
     * 注意：download() 方法内部会自动获取视频信息并填充到 AudioFile 中
     * 这个方法仅用于在下载前预览视频信息（如前端显示分P列表）
     *
     * @param url - 视频URL或ID
     * @returns Promise<视频信息>
     * @throws Error - 当URL无效或获取失败时抛出
     */
    getVideoInfo?(url: string): Promise<VideoInfo>;
}
