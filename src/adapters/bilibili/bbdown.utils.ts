import path from 'path';
import { VideoInfo as AdapterVideoInfo } from '../base/download-adapter.interface';

/**
 * 根据当前平台和架构获取 BBDown 二进制文件路径
 *
 * 平台映射:
 * - darwin: macOS
 * - linux: Linux
 * - win32: Windows
 *
 * 架构映射:
 * - arm64: ARM64 架构 (如 Apple Silicon)
 * - x64: x86_64 架构
 *
 * @returns BBDown 二进制的完整路径
 * @example
 * // macOS Apple Silicon
 * getBBDownPath() // => '/path/to/bin/BBDown-darwin-arm64'
 *
 * // Linux x86_64
 * getBBDownPath() // => '/path/to/bin/BBDown-linux-x64'
 */
export const getBBDownPath = (): string => {
    // 获取当前平台信息
    const platform = process.platform; // 'darwin' | 'linux' | 'win32'
    const arch = process.arch;         // 'arm64' | 'x64'

    // Windows 平台需要 .exe 扩展名
    const ext = platform === 'win32' ? '.exe' : '';

    // 构建二进制文件名: BBDown-{platform}-{arch}[.exe]
    const binaryName = `BBDown-${platform}-${arch}${ext}`;

    // 返回完整路径: bin/ 目录在项目根目录下
    return path.join(__dirname, '../../../bin', binaryName);
};

/**
 * 验证 B 站视频 URL 格式
 *
 * 支持的格式:
 * - 完整 URL: https://www.bilibili.com/video/BV1qt4y1X7TW
 * - 短链接: https://b23.tv/xxx
 * - 纯 BV 号: BV1qt4y1X7TW
 * - AV 号: av170001
 *
 * @param url - 待验证的 URL 或视频 ID
 * @returns 是否为有效的 B 站视频链接
 */
export const isValidBilibiliUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // 去除首尾空格
    const trimmedUrl = url.trim();

    // 正则表达式匹配 B 站视频 URL 或 ID
    // 1. 完整 URL: bilibili.com/video/BVxxx 或 bilibili.com/video/avxxx
    // 2. 短链接: b23.tv/xxx
    // 3. 纯 BV 号: BV 开头，后跟字母数字
    // 4. 纯 AV 号: av 开头，后跟数字
    const patterns = [
        /bilibili\.com\/video\/(BV[a-zA-Z0-9]+|av\d+)/,  // 完整 URL
        /b23\.tv\/[a-zA-Z0-9]+/,                         // 短链接
        /^BV[a-zA-Z0-9]+$/,                              // 纯 BV 号
        /^av\d+$/i                                       // 纯 AV 号
    ];

    // 只要匹配任意一个格式即为有效
    return patterns.some(pattern => pattern.test(trimmedUrl));
};

/**
 * 从 B 站 URL 中提取 BV 号或 AV 号
 *
 * @param url - B 站视频 URL 或 ID
 * @returns 视频 ID（BV 号或 AV 号），如果提取失败返回 null
 * @example
 * extractVideoId('https://www.bilibili.com/video/BV1qt4y1X7TW')
 * // => 'BV1qt4y1X7TW'
 *
 * extractVideoId('BV1qt4y1X7TW')
 * // => 'BV1qt4y1X7TW'
 *
 * extractVideoId('av170001')
 * // => 'av170001'
 */
export const extractVideoId = (url: string): string | null => {
    if (!url || typeof url !== 'string') {
        return null;
    }

    const trimmedUrl = url.trim();

    // 1. 尝试提取 BV 号（优先级高）
    const bvMatch = trimmedUrl.match(/BV[a-zA-Z0-9]+/);
    if (bvMatch) {
        return bvMatch[0];
    }

    // 2. 尝试提取 AV 号
    const avMatch = trimmedUrl.match(/av(\d+)/i);
    if (avMatch) {
        return avMatch[0].toLowerCase(); // 统一转小写 av170001
    }

    // 3. 如果是短链接，直接返回（BBDown 支持短链接）
    if (/b23\.tv\/[a-zA-Z0-9]+/.test(trimmedUrl)) {
        return trimmedUrl;
    }

    return null;
};

/**
 * 构建获取视频信息的 BBDown 参数数组
 *
 * @param url - B 站视频 URL 或 ID
 * @returns 命令行参数数组
 * @example
 * buildBBDownInfoArgs('BV1qt4y1X7TW')
 * // => ['BV1qt4y1X7TW', '-info']
 */
export const buildBBDownInfoArgs = (url: string): string[] => {
    return [
        url,        // 视频 URL 或 ID
        '-info'     // 仅获取信息不下载
    ];
};

/**
 * 构建 BBDown 命令行参数数组
 *
 * @param options - 下载选项
 * @param options.url - B 站视频 URL 或 ID
 * @param options.workDir - 下载目录路径
 * @param options.filePattern - 文件命名模板
 * @param options.selectPage - 选择的分P页码（可选），如 "1,2,3" 或 "ALL"
 * @returns 命令行参数数组
 * @example
 * buildBBDownArgs({
 *   url: 'BV1qt4y1X7TW',
 *   workDir: '/podcasts/我的播客',
 *   filePattern: '<videoTitle>'
 * })
 * // => ['BV1qt4y1X7TW', '--audio-only', '--work-dir', '/podcasts/我的播客', '-F', '<videoTitle>']
 *
 * @example
 * buildBBDownArgs({
 *   url: 'BV1qt4y1X7TW',
 *   workDir: '/podcasts/我的播客',
 *   filePattern: '<pageTitle>',
 *   selectPage: '1,2,3'
 * })
 * // => ['BV1qt4y1X7TW', '--audio-only', '-p', '1,2,3', '--work-dir', '/podcasts/我的播客', '-F', '<pageTitle>']
 */
export const buildBBDownArgs = (options: {
    url: string;
    workDir: string;
    filePattern: string;
    selectPage?: string;
}): string[] => {
    const { url, workDir, filePattern, selectPage } = options;

    // 构建参数数组
    const args: string[] = [
        url,                    // 视频 URL 或 ID (必需，放在第一位)
        '--audio-only'          // 仅下载音频
    ];

    // 如果指定了分P选择，添加 -p 参数
    if (selectPage) {
        args.push('-p', selectPage);
    }

    // 添加工作目录和文件模板
    args.push(
        '--work-dir', workDir,  // 指定工作目录
        '-F', filePattern       // 文件命名模板
    );

    return args;
};

/**
 * 从 BBDown 输出中解析进度信息
 *
 * BBDown 进度输出格式示例:
 * - [93.2%] [10.5MB/s] [ETA: 00:00:05]
 * - 下载中... 93.2% 10.5MB/s 剩余时间: 00:00:05
 *
 * @param output - BBDown 的 stdout 输出字符串
 * @returns 进度信息对象，如果无法解析返回 null
 */
export const parseProgress = (output: string): {
    percent: number;
    speed: string;
    eta: string;
} | null => {
    if (!output) {
        return null;
    }

    // 尝试匹配百分比: [93.2%] 或 93.2%
    const percentMatch = output.match(/(\d+\.?\d*)%/);
    if (!percentMatch) {
        return null; // 没有进度信息
    }

    const percent = parseFloat(percentMatch[1]);

    // 尝试匹配速度: [10.5MB/s] 或 10.5MB/s
    const speedMatch = output.match(/(\d+\.?\d*\s?[KMG]B\/s)/i);
    const speed = speedMatch ? speedMatch[1] : 'N/A';

    // 尝试匹配剩余时间: [ETA: 00:00:05] 或 剩余时间: 00:00:05
    const etaMatch = output.match(/(?:ETA|剩余时间):\s*(\d{2}:\d{2}:\d{2})/);
    const eta = etaMatch ? etaMatch[1] : 'N/A';

    return {
        percent,
        speed,
        eta
    };
};

/**
 * 从 BBDown 输出中提取下载完成的文件路径
 *
 * BBDown 完成输出格式示例:
 * - 混流完成: /path/to/file.m4a
 * - Mux Done: /path/to/file.m4a
 * - 任务完成: /path/to/file.m4a
 *
 * @param output - BBDown 的完整输出字符串
 * @returns 文件路径，如果提取失败返回 null
 */
export const extractFilePath = (output: string): string | null => {
    if (!output) {
        return null;
    }

    // 匹配各种完成提示后的文件路径
    // 关键词: 混流完成、Mux Done、任务完成
    const patterns = [
        /(?:混流完成|Mux Done|任务完成):\s*(.+)/,
        /(?:文件已保存|Saved to):\s*(.+)/
    ];

    for (const pattern of patterns) {
        const match = output.match(pattern);
        if (match) {
            // 提取路径并去除首尾空格和引号
            return match[1].trim().replace(/["']/g, '');
        }
    }

    return null;
};

/**
 * 根据视频标题生成播客目录名
 *
 * 处理逻辑:
 * 1. 去除常见的剧集标记（如 EP01、第1集、#1 等）
 * 2. 去除特殊字符，保留中文、英文、数字
 * 3. 限制长度，避免文件系统路径过长
 *
 * @param videoTitle - 原始视频标题
 * @returns 播客目录名
 * @example
 * generatePodcastName('【我的播客】EP01 - 第一集')
 * // => '我的播客'
 *
 * generatePodcastName('Amazing Podcast #1 - Introduction')
 * // => 'Amazing Podcast'
 */
export const generatePodcastName = (videoTitle: string): string => {
    if (!videoTitle) {
        return 'bilibili-podcast';
    }

    // 1. 去除常见的剧集标记
    let name = videoTitle
        .replace(/第?\s*\d+\s*[集期话]/g, '')           // 第1集、第01期、第1话
        .replace(/EP?\s*\d+/gi, '')                      // EP01、E01、ep1
        .replace(/#\s*\d+/g, '')                         // #1、# 01
        .replace(/\[\s*\d+\s*\]/g, '')                   // [01]、[ 1 ]
        .replace(/\d{8}/g, '')                           // 日期格式 20231201
        .trim();

    // 2. 去除【】、()、[] 及其内容中的序号标记
    name = name
        .replace(/【[^】]*\d+[^】]*】/g, '')              // 【第01集】
        .replace(/\([^)]*\d+[^)]*\)/g, '')               // (第01集)
        .replace(/\[[^\]]*\d+[^\]]*\]/g, '');            // [第01集]

    // 3. 保留【】、()、[] 中的非序号内容，但去除括号
    name = name
        .replace(/[【】\[\]()]/g, ' ')
        .replace(/[-_|]/g, ' ')                          // 替换分隔符为空格
        .replace(/\s+/g, ' ')                            // 合并多个空格
        .trim();

    // 4. 如果清理后为空，使用默认名称
    if (!name) {
        return 'bilibili-podcast';
    }

    // 5. 限制长度（最多 50 个字符）
    if (name.length > 50) {
        name = name.substring(0, 50).trim();
    }

    return name;
};

/**
 * 从视频标题中提取剧集标题
 *
 * 尝试识别并保留剧集相关的信息
 * 如果无法识别剧集信息，返回完整标题
 *
 * @param videoTitle - 原始视频标题
 * @returns 剧集标题
 * @example
 * extractEpisodeTitle('【我的播客】EP01 - 第一集的内容')
 * // => 'EP01 - 第一集的内容'
 *
 * extractEpisodeTitle('Amazing Podcast - Introduction')
 * // => 'Introduction'
 */
export const extractEpisodeTitle = (videoTitle: string): string => {
    if (!videoTitle) {
        return 'Untitled Episode';
    }

    // 1. 尝试提取【】、()、[] 后面的内容作为剧集标题
    const afterBracketsMatch = videoTitle.match(/[【\[(].*?[】\])](.+)/);
    if (afterBracketsMatch) {
        return afterBracketsMatch[1].trim();
    }

    // 2. 尝试提取 - 或 | 分隔符后的内容
    const afterSeparatorMatch = videoTitle.match(/[-|](.+)/);
    if (afterSeparatorMatch) {
        return afterSeparatorMatch[1].trim();
    }

    // 3. 如果没有分隔符，返回完整标题
    return videoTitle.trim();
};

/**
 * 视频分P信息接口
 */
export interface VideoPage {
    /** 分P序号（从1开始） */
    index: number;
    /** 分P标题 */
    title: string;
    /** 时长（秒） */
    duration?: number;
}

/**
 * 视频信息接口
 */
export interface VideoInfo {
    /** 视频BV号 */
    bvid: string;
    /** 视频标题 */
    title: string;
    /** 作者名称 */
    author?: string;
    /** 是否为多分P视频 */
    isMultiPage: boolean;
    /** 分P列表 */
    pages: VideoPage[];
}

/**
 * 从 BBDown 的 -info 输出中解析视频信息
 *
 * BBDown -info 输出格式示例:
 * ```
 * [2025-12-20 18:45:44.824] - 视频标题: 【4K60帧】咬人猫最新单曲《dududu》有没有戳中你心~【BML2020单品】
 * [2025-12-20 18:45:44.824] - 发布时间: 2020-07-25 21:38:46 +08:00
 * [2025-12-20 18:45:44.824] - UP主页: https://space.bilibili.com/403748305
 * [2025-12-20 18:45:44.824] - P1: [220355130] [dududu] [03m46s]
 * [2025-12-20 18:45:44.824] - P2: [220355131] [第二集] [05m20s]
 * [2025-12-20 18:45:44.825] - 共计 2 个分P, 已选择：ALL
 * ```
 *
 * 注意: BBDown 的 -info 输出在多P视频时只显示前几个和最后一个作为示例
 *
 * @param output - BBDown -info 命令的 stdout 输出
 * @param videoId - 视频ID (BV号或AV号)，用于填充bvid字段
 * @returns 视频信息对象，如果解析失败返回 null
 */
export const parseVideoInfo = (output: string, videoId?: string): VideoInfo | null => {
    if (!output) {
        return null;
    }

    try {
        // 提取视频标题
        const titleMatch = output.match(/- 视频标题[：:]\s*(.+?)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';

        // 使用传入的 videoId，如果没有则尝试从输出中提取
        let bvid = videoId || 'Unknown';
        if (!videoId) {
            const bvidMatch = output.match(/BV[a-zA-Z0-9]+/);
            bvid = bvidMatch ? bvidMatch[0] : 'Unknown';
        }

        // 提取UP主ID（从UP主页链接）
        const upMatch = output.match(/UP主页.*space\.bilibili\.com\/(\d+)/);
        const author = upMatch ? `UP主 ${upMatch[1]}` : undefined;

        // 提取总分P数量
        // 格式: "共计 25 个分P, 已选择：ALL" 或 "共计 1 个分P, 已选择：ALL"
        const totalPagesMatch = output.match(/共计\s*(\d+)\s*个分P/);
        const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 1;

        // 解析分P列表
        // 格式: - P1: [220355130] [dududu] [03m46s]
        // 或者: - P2: [220355131] [第二集] [05m20s]
        // 注意: BBDown 在多P视频时只显示部分分P作为示例（前几个+最后一个）
        const pages: VideoPage[] = [];
        const pagePattern = /- P(\d+):\s*\[(\d+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]/gm;
        let pageMatch;

        while ((pageMatch = pagePattern.exec(output)) !== null) {
            const index = parseInt(pageMatch[1], 10);
            const cid = pageMatch[2];
            const pageTitle = pageMatch[3].trim();
            const durationStr = pageMatch[4].trim(); // 如 "03m46s" 或 "1h05m20s"

            // 解析时长字符串为秒数
            let duration: number | undefined;
            try {
                duration = parseDurationString(durationStr);
            } catch (e) {
                // 解析失败，跳过时长
                duration = undefined;
            }

            pages.push({
                index,
                title: pageTitle,
                duration
            });
        }

        // 如果没有找到分P信息，说明可能是单P视频
        const isMultiPage = totalPages > 1;

        if (pages.length === 0) {
            // 单P视频，添加默认的P1，使用视频标题
            pages.push({
                index: 1,
                title,
                duration: undefined
            });
        }

        // 如果总分P数大于解析到的分P数，说明BBDown只返回了部分示例
        // 需要补全缺失的分P（使用占位信息）
        if (totalPages > pages.length && isMultiPage) {
            // 创建一个Set存储已有的分P索引
            const existingIndexes = new Set(pages.map(p => p.index));

            // 补全缺失的分P
            for (let i = 1; i <= totalPages; i++) {
                if (!existingIndexes.has(i)) {
                    pages.push({
                        index: i,
                        title: `P${i}`,  // 使用占位标题
                        duration: undefined
                    });
                }
            }

            // 按索引排序
            pages.sort((a, b) => a.index - b.index);
        }

        return {
            bvid,
            title,
            author,
            isMultiPage,
            pages
        };
    } catch (error) {
        console.error('解析视频信息失败:', error);
        return null;
    }
};

/**
 * 解析时长字符串为秒数
 *
 * 支持格式:
 * - "03m46s" => 3*60 + 46 = 226秒
 * - "1h05m20s" => 1*3600 + 5*60 + 20 = 3920秒
 * - "45s" => 45秒
 *
 * @param durationStr - 时长字符串
 * @returns 秒数
 */
function parseDurationString(durationStr: string): number {
    let totalSeconds = 0;

    // 提取小时
    const hourMatch = durationStr.match(/(\d+)h/);
    if (hourMatch) {
        totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    }

    // 提取分钟
    const minMatch = durationStr.match(/(\d+)m/);
    if (minMatch) {
        totalSeconds += parseInt(minMatch[1], 10) * 60;
    }

    // 提取秒
    const secMatch = durationStr.match(/(\d+)s/);
    if (secMatch) {
        totalSeconds += parseInt(secMatch[1], 10);
    }

    return totalSeconds;
}

/**
 * 格式化时长（秒）为可读字符串
 *
 * @param seconds - 时长（秒）
 * @returns 格式化的时长字符串，如 "10:30" 或 "1:05:20"
 * @example
 * formatDuration(630)  // => "10:30"
 * formatDuration(3920) // => "1:05:20"
 */
export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
};

/**
 * 从 BBDown -info 输出中提取发布日期
 *
 * @param output - BBDown -info 命令输出
 * @returns ISO 8601 格式日期字符串，失败返回 null
 *
 * @example
 * // 输入: "发布时间: 2020-07-25 21:38:46 +08:00"
 * // 输出: "2020-07-25T21:38:46+08:00"
 */
export const parsePublishDate = (output: string): string | null => {
    if (!output) return null;

    // 匹配格式: "发布时间: 2020-07-25 21:38:46 +08:00"
    const match = output.match(/发布时间[：:]\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*([\+\-]\d{2}:\d{2})/);

    if (!match) return null;

    const [, date, time, timezone] = match;
    // 转换为 ISO 8601: "2020-07-25T21:38:46+08:00"
    return `${date}T${time}${timezone}`;
};

/**
 * 从 BBDown -info 输出中提取UP主信息
 *
 * @param output - BBDown -info 命令输出
 * @returns { name, mid } 对象
 *
 * @example
 * // 输入: "UP主页: https://space.bilibili.com/403748305"
 * // 输出: { mid: "403748305" }
 */
export const parseOwnerInfo = (output: string): { name?: string; mid?: string } => {
    if (!output) return {};

    const result: { name?: string; mid?: string } = {};

    // 提取UP主ID：从 "UP主页: https://space.bilibili.com/403748305" 中提取
    const midMatch = output.match(/UP主页.*space\.bilibili\.com\/(\d+)/);
    if (midMatch) {
        result.mid = midMatch[1];
    }

    // 注意：BBDown -info 输出不包含UP主昵称，需要从其他地方获取
    // 这里暂时不提取昵称

    return result;
};

/**
 * 构建封面下载的 BBDown 参数
 *
 * @param url - 视频URL或ID
 * @param workDir - 工作目录
 * @param fileName - 文件名（不含扩展名）
 * @returns 命令行参数数组
 *
 * @example
 * buildCoverDownloadArgs('BV1qt4y1X7TW', '/podcasts/我的播客', '第一集')
 * // => ['BV1qt4y1X7TW', '--cover-only', '--work-dir', '/podcasts/我的播客', '-F', '第一集']
 */
export const buildCoverDownloadArgs = (
    url: string,
    workDir: string,
    fileName: string
): string[] => {
    return [
        url,                  // 视频 URL 或 ID
        '--cover-only',       // 仅下载封面
        '--work-dir', workDir, // 工作目录
        '-F', fileName        // 文件名模板
    ];
};

/**
 * 生成剧集描述文本
 *
 * @param videoInfo - 视频信息
 * @returns 格式化的描述文本
 *
 * @example
 * generateEpisodeDescription({
 *   id: 'BV1qt4y1X7TW',
 *   ownerMid: '403748305',
 *   publishDate: '2020-07-25T21:38:46+08:00'
 * })
 * // => "BV号: BV1qt4y1X7TW\nUP主ID: 403748305\n发布日期: 2020-07-25"
 */
export const generateEpisodeDescription = (videoInfo: AdapterVideoInfo): string => {
    const parts: string[] = [];

    // 添加BV号
    if (videoInfo.id) {
        parts.push(`BV号: ${videoInfo.id}`);
    }

    // 添加UP主信息
    if (videoInfo.ownerMid) {
        parts.push(`UP主ID: ${videoInfo.ownerMid}`);
    }

    // 添加发布日期
    if (videoInfo.publishDate) {
        // 提取日期部分 "2020-07-25T21:38:46+08:00" => "2020-07-25"
        const dateOnly = videoInfo.publishDate.split('T')[0];
        parts.push(`发布日期: ${dateOnly}`);
    }

    return parts.join('\n');
};
