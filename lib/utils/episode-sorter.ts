/**
 * 剧集排序工具
 * 提供多种排序策略从文件名中提取序号
 */

import { type Episode } from '@/lib/db/schema';

/**
 * 排序策略类型
 */
export type SortStrategy = 'prefix' | 'suffix' | 'first' | 'last' | 'date';

/**
 * 从文件名提取序号
 *
 * @param fileName - 文件名（例如：01-标题.mp3）
 * @param strategy - 排序策略
 * @returns 提取的序号，如果未找到则返回 null
 *
 * @example
 * ```ts
 * extractOrderNumber('01-标题.mp3', 'prefix') // => 1
 * extractOrderNumber('标题-01.mp3', 'suffix') // => 1
 * extractOrderNumber('第01集.mp3', 'first') // => 1
 * extractOrderNumber('S01E02.mp3', 'last') // => 2
 * extractOrderNumber('2024-01-15.mp3', 'date') // => 20240115
 * ```
 */
export function extractOrderNumber(fileName: string, strategy: SortStrategy): number | null {
  switch (strategy) {
    case 'prefix':
      // 前缀数字：01-标题.mp3 → 1
      const prefixMatch = fileName.match(/^(\d+)/);
      return prefixMatch ? parseInt(prefixMatch[1], 10) : null;

    case 'suffix':
      // 后缀数字：标题-01.mp3 → 1
      // 匹配文件扩展名前的数字
      const suffixMatch = fileName.match(/(\d+)(?=\.\w+$)/);
      return suffixMatch ? parseInt(suffixMatch[1], 10) : null;

    case 'first':
      // 第一个数字：第01集.mp3 → 1
      const firstMatch = fileName.match(/(\d+)/);
      return firstMatch ? parseInt(firstMatch[1], 10) : null;

    case 'last':
      // 最后一个数字：S01E02.mp3 → 2
      const allMatches = fileName.match(/\d+/g);
      if (!allMatches || allMatches.length === 0) return null;
      return parseInt(allMatches[allMatches.length - 1], 10);

    case 'date':
      // 日期格式：2024-01-15.mp3 → 20240115
      const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) return null;
      return parseInt(dateMatch[1] + dateMatch[2] + dateMatch[3], 10);

    default:
      return null;
  }
}

/**
 * 排序预览项
 */
export interface ReorderPreviewItem {
  id: string;
  fileName: string;
  title: string;
  oldSortOrder: number;
  newSortOrder: number;
  changed: boolean;
}

/**
 * 排序预览结果
 */
export interface ReorderPreview {
  strategy: SortStrategy;
  total: number;
  changed: number;
  episodes: ReorderPreviewItem[];
}

/**
 * 预览排序结果
 *
 * @param episodes - 剧集列表
 * @param strategy - 排序策略
 * @returns 排序预览结果
 *
 * @example
 * ```ts
 * const preview = previewReorder(episodes, 'prefix');
 * console.log(`总共 ${preview.total} 个剧集，${preview.changed} 个排名将改变`);
 *
 * preview.episodes.forEach(ep => {
 *   if (ep.changed) {
 *     console.log(`${ep.title}: #${ep.oldSortOrder} → #${ep.newSortOrder}`);
 *   }
 * });
 * ```
 *
 * 工作流程：
 * 1. 为每个剧集提取序号
 * 2. 按提取的序号排序（未提取到序号的排在最后）
 * 3. 分配新的 sortOrder（从 1 开始）
 * 4. 比较新旧 sortOrder，标记哪些剧集的排序改变了
 */
export function previewReorder(
  episodes: Episode[],
  strategy: SortStrategy
): ReorderPreview {
  // 提取序号并记录原始顺序
  const episodesWithNumber = episodes.map((ep, index) => ({
    episode: ep,
    oldSortOrder: ep.sortOrder || index + 1,
    extractedNumber: extractOrderNumber(ep.fileName, strategy),
  }));

  // 按提取的序号排序
  // 规则：
  // 1. 提取到序号的排在前面，按序号升序
  // 2. 未提取到序号的排在后面，保持原有顺序
  const sorted = episodesWithNumber.sort((a, b) => {
    // 如果两个都没有提取到序号，保持原有顺序
    if (a.extractedNumber === null && b.extractedNumber === null) {
      return 0;
    }
    // 没有提取到序号的排在后面
    if (a.extractedNumber === null) return 1;
    if (b.extractedNumber === null) return -1;
    // 都提取到序号，按序号升序排列
    return a.extractedNumber - b.extractedNumber;
  });

  // 分配新的 sortOrder（从 1 开始）
  const previewItems: ReorderPreviewItem[] = sorted.map((item, index) => {
    const newSortOrder = index + 1;
    return {
      id: item.episode.id,
      fileName: item.episode.fileName,
      title: item.episode.title,
      oldSortOrder: item.oldSortOrder,
      newSortOrder,
      changed: item.oldSortOrder !== newSortOrder,
    };
  });

  // 统计改变的数量
  const changed = previewItems.filter((item) => item.changed).length;

  return {
    strategy,
    total: episodes.length,
    changed,
    episodes: previewItems,
  };
}

/**
 * 获取策略的显示名称
 *
 * @param strategy - 排序策略
 * @returns 策略的中文显示名称
 */
export function getStrategyDisplayName(strategy: SortStrategy): string {
  const names: Record<SortStrategy, string> = {
    prefix: '前缀数字（01-标题）',
    suffix: '后缀数字（标题-01）',
    first: '第一个数字',
    last: '最后一个数字',
    date: '日期格式（2024-01-15）',
  };
  return names[strategy];
}

/**
 * 获取所有可用的排序策略
 *
 * @returns 策略列表（值和显示名称）
 */
export function getAllStrategies(): Array<{ value: SortStrategy; label: string }> {
  return [
    { value: 'prefix', label: '前缀数字（01-标题）' },
    { value: 'suffix', label: '后缀数字（标题-01）' },
    { value: 'first', label: '第一个数字' },
    { value: 'last', label: '最后一个数字' },
    { value: 'date', label: '日期格式（2024-01-15）' },
  ];
}
