import path from 'path';

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
    return path.join(__dirname, '../../bin', binaryName);
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
 * 构建 BBDown 命令行参数数组
 *
 * @param options - 下载选项
 * @param options.url - B 站视频 URL 或 ID
 * @param options.workDir - 下载目录路径
 * @param options.filePattern - 文件命名模板
 * @returns 命令行参数数组
 * @example
 * buildBBDownArgs({
 *   url: 'BV1qt4y1X7TW',
 *   workDir: '/podcasts/我的播客',
 *   filePattern: '<videoTitle>'
 * })
 * // => ['BV1qt4y1X7TW', '--audio-only', '--work-dir', '/podcasts/我的播客', '-F', '<videoTitle>']
 */
export const buildBBDownArgs = (options: {
    url: string;
    workDir: string;
    filePattern: string;
}): string[] => {
    const { url, workDir, filePattern } = options;

    // 构建参数数组
    // 参数顺序: [视频URL, --audio-only, --work-dir, 目录, -F, 文件模板]
    return [
        url,                    // 视频 URL 或 ID (必需，放在第一位)
        '--audio-only',         // 仅下载音频
        '--work-dir', workDir,  // 指定工作目录
        '-F', filePattern       // 文件命名模板
    ];
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
