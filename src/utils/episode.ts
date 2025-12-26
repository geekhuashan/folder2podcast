import { Episode, PodcastConfig, EpisodeNumberStrategy } from '../types';
import crypto from 'crypto';

const BASE_DATE = new Date('2024-12-18T00:00:00.000Z');

/**
 * 前缀数字策略：匹配文件名开头部分的数字
 *
 * 规则：只看前5个字符，如果数字之前有中文则不匹配
 *
 * 适用场景：
 * - 01-盗墓笔记.mp3 → 1（数字在开头）
 * - [P25]轨迹.mp3 → 25（数字在符号后）
 * - (EP01)标题.mp3 → 1（数字在括号内）
 * - 第25集.mp3 → 25（数字在"第"之后，是完整的"第X集"格式）
 *
 * 不适用：盗墓笔记01.mp3（数字之前有中文"盗墓笔记"）
 */
function findPrefixNumber(fileName: string): number | null {
    // 只看前5个字符
    const prefix = fileName.substring(0, 5);
    // 匹配第一个数字及其之前的内容
    const match = prefix.match(/^([^\d]*?)(\d+)/);
    if (!match) return null;

    const beforeNumber = match[1]; // 数字之前的字符
    const number = match[2]; // 提取到的数字

    // 如果数字之前有中文字符（不包括"第"这个字），则不视为前缀数字
    // "第X集"是一个特殊的、完整的序号表达方式，应该被识别
    if (/[\u4e00-\u9fa5]/.test(beforeNumber) && beforeNumber !== '第') {
        return null;
    }

    return parseInt(number, 10);
}

/**
 * 后缀数字策略：匹配文件名结尾部分的数字
 *
 * 规则：去掉扩展名后，只看后5个字符，如果有数字就提取
 *
 * 适用场景：
 * - 盗墓笔记01.mp3 → 1
 * - 盗墓笔记-01.mp3 → 1
 * - 盗墓笔记_01.mp3 → 1
 * - 盗墓笔记 01.mp3 → 1
 *
 * 不适用：01-盗墓笔记.mp3（数字在前面）
 */
function findSuffixNumber(fileName: string): number | null {
    // 去掉扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    // 只看后5个字符
    const suffix = nameWithoutExt.slice(-5);
    // 找最后一个数字
    const matches = suffix.match(/(\d+)/g);
    if (!matches) return null;
    return parseInt(matches[matches.length - 1], 10);
}

/**
 * 第一个数字策略：匹配文件名中第一个出现的数字（最宽松）
 *
 * 适用场景：几乎所有格式
 * - 01-盗墓笔记.mp3 → 1
 * - 盗墓笔记01.mp3 → 1
 * - [P25]轨迹.mp3 → 25
 *
 * 注意：可能误取不相关的数字
 * - 2024-01-01-日记.mp3 → 2024（可能不是期望的序号）
 */
function findFirstNumber(fileName: string): number | null {
    // 匹配第一个出现的连续数字
    const match = fileName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * 最后一个数字策略：匹配文件名中最后一个出现的数字
 *
 * 适用场景：
 * - 标题-2024-01.mp3 → 1
 * - 日记20240101.mp3 → 20240101
 *
 * 注意：适合末尾有唯一序号的场景
 */
function findLastNumber(fileName: string): number | null {
    // 去掉扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    // 匹配所有数字组
    const matches = nameWithoutExt.match(/(\d+)/g);
    if (!matches) return null;

    // 找到最后一个数字
    const lastNumber = matches[matches.length - 1];
    return parseInt(lastNumber, 10);
}

/**
 * 日期策略：自动识别常见日期格式
 *
 * 支持的格式：
 * - YYYY-MM-DD: 2024-01-15
 * - YYYY.MM.DD: 2024.01.15
 * - YYYY_MM_DD: 2024_01_15
 * - YYYYMMDD: 20240115
 * - YYYY/MM/DD: 2024/01/15
 *
 * 适用场景：
 * - 2024-01-15-新年特辑.mp3 → 20240115
 * - 日记-2024-01-15.mp3 → 20240115
 * - 新闻20240115.mp3 → 20240115
 */
function findDateNumber(fileName: string): number | null {
    // 去掉扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // 匹配常见日期格式
    // YYYY-MM-DD, YYYY.MM.DD, YYYY_MM_DD, YYYY/MM/DD
    const datePattern = /(\d{4})[-._/](\d{1,2})[-._/](\d{1,2})/;
    const match = nameWithoutExt.match(datePattern);

    if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return parseInt(`${year}${month}${day}`, 10);
    }

    // 匹配紧凑格式 YYYYMMDD
    const compactPattern = /(\d{8})/;
    const compactMatch = nameWithoutExt.match(compactPattern);

    if (compactMatch) {
        const dateStr = compactMatch[1];
        // 验证是否是合理的日期格式 (年份 >= 1900, 月份 01-12, 日期 01-31)
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));

        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return parseInt(dateStr, 10);
        }
    }

    return null;
}

/**
 * 自定义正则表达式策略：使用用户提供的正则表达式
 *
 * 用户需要提供一个包含捕获组的正则表达式
 * 例如：(\d+) 会匹配第一个数字
 */
function findNumberByPattern(fileName: string, pattern: string): number | null {
    try {
        const match = fileName.match(new RegExp(pattern));
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }
    } catch (error) {
        console.warn(`Error using custom pattern: ${error}`);
    }
    return null;
}

export function parseEpisodeNumber(fileName: string, config?: PodcastConfig): number | null {
    const strategy = config?.episodeNumberStrategy || 'prefix';

    // 根据策略选择提取方法
    if (typeof strategy === 'string') {
        switch (strategy) {
            case 'prefix':
                return findPrefixNumber(fileName);
            case 'suffix':
                return findSuffixNumber(fileName);
            case 'first':
                return findFirstNumber(fileName);
            case 'last':
                return findLastNumber(fileName);
            case 'date':
                return findDateNumber(fileName);
            default:
                console.warn(`Unknown strategy: ${strategy}, falling back to prefix`);
                return findPrefixNumber(fileName);
        }
    } else if (strategy.pattern) {
        // 使用自定义正则表达式
        const result = findNumberByPattern(fileName, strategy.pattern);
        if (result !== null) {
            return result;
        }
        // 如果自定义正则表达式失败，回退到默认策略
        console.warn(`Custom pattern failed for "${fileName}", falling back to prefix strategy`);
        return findPrefixNumber(fileName);
    }

    // 如果策略无效，使用默认的前缀策略
    return findPrefixNumber(fileName);
}

/**
 * 根据提取到的序号和策略，自动清理标题
 *
 * @param fileName 文件名
 * @param strategy 序号提取策略
 * @param extractedNumber 提取到的序号（如果有）
 * @returns 清理后的标题
 */
export function parseEpisodeTitle(
    fileName: string,
    strategy: EpisodeNumberStrategy,
    extractedNumber: number | null
): string {
    // 移除文件扩展名
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');

    // 如果没有提取到序号，返回完整文件名
    if (extractedNumber === null) {
        return withoutExt;
    }

    // 根据策略清理标题
    const strategyType = typeof strategy === 'string' ? strategy : 'custom';

    switch (strategyType) {
        case 'prefix':
        case 'first':
            // 特殊处理"第X集"、"第X话"、"第X期"等格式
            let cleaned = withoutExt.replace(/^第\d+[集话期章节回讲课][-_.\s]*/, '');

            // 如果没有匹配到"第X集"格式，使用通用清理
            if (cleaned === withoutExt) {
                cleaned = withoutExt.replace(/^[^\d]*\d+[^\u4e00-\u9fa5a-zA-Z\d]*/, '');
            }

            return cleaned.trim();

        case 'suffix':
        case 'last':
            // 清理结尾的序号和相关字符
            return withoutExt.replace(/[^\u4e00-\u9fa5a-zA-Z\d]*\d+[^\d]*$/, '').trim();

        case 'date':
            // 清理日期部分
            // 匹配 YYYY-MM-DD, YYYY.MM.DD, YYYY_MM_DD, YYYY/MM/DD 格式（在开头）
            let dateRemoved = withoutExt.replace(/^\d{4}[-._/]\d{1,2}[-._/]\d{1,2}[-._\s]*/, '');

            // 如果没有匹配到，尝试匹配紧凑格式 YYYYMMDD（在开头）
            if (dateRemoved === withoutExt) {
                dateRemoved = withoutExt.replace(/^\d{8}[-._\s]*/, '');
            }

            // 如果日期在末尾（带分隔符格式），清理日期和前面的分隔符
            if (dateRemoved === withoutExt) {
                dateRemoved = withoutExt.replace(/[-._\s]+\d{4}[-._/]\d{1,2}[-._/]\d{1,2}$/, '');
            }

            // 如果日期在末尾（紧凑格式 YYYYMMDD），清理日期（分隔符可选）
            if (dateRemoved === withoutExt) {
                dateRemoved = withoutExt.replace(/[-._\s]*\d{8}$/, '');
            }

            // 如果日期在中间或末尾但紧邻文字（如"新闻20241217"），尝试更宽松的匹配
            if (dateRemoved === withoutExt) {
                dateRemoved = withoutExt.replace(/\d{4}[-._/]\d{1,2}[-._/]\d{1,2}$/, '');
            }

            return dateRemoved.trim();

        case 'custom':
            // 自定义策略：尝试移除提取到的数字及其周围的分隔符
            const numStr = extractedNumber.toString();
            return withoutExt.replace(new RegExp(`[^\\d]*${numStr}[^\\u4e00-\\u9fa5a-zA-Z\\d]*`), '').trim();

        default:
            return withoutExt;
    }
}

export function generatePubDate(episodeNumber: number): Date {
    // 根据剧集编号增加天数
    const pubDate = new Date(BASE_DATE);
    pubDate.setDate(BASE_DATE.getDate() + episodeNumber - 1);
    return pubDate;
}

/**
 * 将日期数字（如 20240115）转换为 Date 对象
 * @param dateNumber 8位日期数字 YYYYMMDD
 * @returns Date 对象，如果格式无效则返回 null
 */
function parseDateNumber(dateNumber: number): Date | null {
    const dateStr = dateNumber.toString();
    if (dateStr.length !== 8) {
        return null;
    }

    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));

    // 验证日期有效性
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    // 创建 UTC 日期，避免时区问题
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function getFileMetadata(stats: { createdAt: Date; modifiedAt: Date; size: number }) {
    // 使用创建时间作为 pubDate
    const pubDate = stats.createdAt;
    // 生成排序值（基于时间戳和文件大小）
    const sortValue = Math.floor(stats.createdAt.getTime() / 1000) * 10000 +
        parseInt(String(stats.size).slice(0, 4));

    return {
        pubDate,
        sortValue
    };
}

// 根据配置和文件信息生成发布日期
function generateEpisodePubDate(params: {
    number: number | null;
    metadataPubDate: Date;
    useMTime?: boolean;
    strategy?: EpisodeNumberStrategy;
}): Date {
    const { number, metadataPubDate, useMTime, strategy } = params;

    // 如果配置为使用文件修改时间，直接返回
    if (useMTime) {
        return metadataPubDate;
    }

    // 如果有序号
    if (number !== null) {
        // 如果是日期策略，尝试将序号解析为真实日期
        if (strategy === 'date') {
            const parsedDate = parseDateNumber(number);
            if (parsedDate) {
                return parsedDate;
            }
            // 解析失败，使用文件修改时间
            console.warn(`Failed to parse date number ${number}, using file mtime`);
            return metadataPubDate;
        }

        // 其他策略：使用序号生成日期
        return generatePubDate(number);
    }

    // 默认使用文件修改时间
    return metadataPubDate;
}

/**
 * 创建剧集对象
 * @param fileName 文件名
 * @param fileStats 文件统计信息（来自 storage.getFileStats）
 * @param config 播客配置
 * @returns 剧集对象
 */
export function createEpisode(
    fileName: string,
    fileStats: { createdAt: Date; modifiedAt: Date; size: number },
    config?: PodcastConfig
): Episode {
    const strategy = config?.episodeNumberStrategy || 'prefix';
    const number = parseEpisodeNumber(fileName, config);

    // 自动根据序号提取结果决定标题
    // - 提取成功：清理标题（移除序号部分）
    // - 提取失败：保留完整文件名
    const title = parseEpisodeTitle(fileName, strategy, number);

    const { pubDate: metadataPubDate, sortValue } = getFileMetadata(fileStats);

    // 生成最终的发布日期
    const pubDate = generateEpisodePubDate({
        number,
        metadataPubDate,
        useMTime: config?.useMTime,
        strategy
    });

    // 生成最终的序号（用于排序）
    const finalNumber = number !== null ? number : sortValue;

    return {
        number: finalNumber,
        title,
        fileName,
        pubDate
    };
}

export function validateFileName(fileName: string): boolean {
    // 检查是否是支持的音频格式
    const supportedFormats = /\.(mp3|m4a|wav)$/i;
    return supportedFormats.test(fileName);
}

// 直接运行测试
if (require.main === module) {
    // 测试用例
    const files = [
        'zk001 第一期.mp3',
        'zk发刊词 来，每天跟上全球科技新变化.mp3',
        'zk003 英伟达收购ARM：为什么引起芯片行业震动？.mp3',
        'zk004 可能&性&空间：为什么不幸的家庭各有各的不幸.mp3'
    ];

    // 添加后缀测试用例
    const moreFiles = [
        ...files,
        '第一期_001.mp3',
        '科技早知道ep003.mp3',
        '人工智能_005.wav'
    ];

    // 测试不同的策略
    const strategies = ['prefix', 'first', 'last', 'suffix'] as const;

    strategies.forEach(strategy => {
        console.log(`\n测试 ${strategy} 策略：`);
        console.log('-'.repeat(50));

        moreFiles.forEach(file => {
            const number = parseEpisodeNumber(file, { episodeNumberStrategy: strategy });
            console.log(`文件: ${file}`);
            console.log(`提取的序号: ${number === null ? '无序号' : number}`);
            console.log('-'.repeat(20));
        });
    });
}