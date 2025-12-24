/**
 * sortOrder 排序工具函数
 *
 * 功能:
 * - 根据 sortOrder 自动生成 pubDate
 * - sortOrder 越小越新 (sortOrder=1 的 pubDate 最大)
 */

/**
 * 根据 sortOrder 生成 pubDate
 *
 * @param sortOrder - 剧集序号
 * @param baseDate - 基准时间
 * @param maxSortOrder - 最大序号
 * @returns 生成的 pubDate
 *
 * 算法:
 * - pubDate = baseDate + (maxSortOrder - sortOrder) 天
 * - sortOrder 越小,pubDate 越大 (越新)
 *
 * 示例 (baseDate=2024-12-18, maxSortOrder=10):
 * - sortOrder=1  → pubDate = 2024-12-27 (最新,日期最大)
 * - sortOrder=2  → pubDate = 2024-12-26
 * - sortOrder=10 → pubDate = 2024-12-18 (最旧,日期最小)
 */
export function generatePubDateFromSortOrder(
  sortOrder: number,
  baseDate: Date,
  maxSortOrder: number
): Date {
  if (sortOrder < 1) {
    throw new Error('sortOrder 必须大于等于 1');
  }

  // pubDate = baseDate + (maxSortOrder - sortOrder) 天
  // sortOrder 越小,加的天数越多,pubDate 越大
  const pubDate = new Date(baseDate);
  pubDate.setDate(pubDate.getDate() + (maxSortOrder - sortOrder));

  return pubDate;
}

/**
 * 获取基准日期
 *
 * 优先级:
 * 1. 用户配置的 podcast.basePubDate
 * 2. 固定基准时间 2024-12-18 (默认)
 *
 * @param podcast - 播客信息
 * @param episodes - 剧集列表
 * @returns 基准日期
 */
export function getBasePubDate(
  podcast: { basePubDate?: Date | null },
  episodes: Array<{ sortOrder: number | null; createdAt: Date }>
): Date {
  // 优先级 1: 用户配置的基准日期
  if (podcast.basePubDate) {
    return podcast.basePubDate;
  }

  // 优先级 2: 固定基准时间 2024-12-18
  return new Date('2024-12-18T00:00:00Z');
}

/**
 * 为剧集列表批量生成 pubDate
 *
 * @param episodes - 剧集列表
 * @param baseDate - 基准日期
 * @returns 更新了 pubDate 的剧集列表
 */
export function generatePubDatesForEpisodes<T extends { sortOrder: number | null; pubDate?: Date | null }>(
  episodes: T[],
  baseDate: Date
): T[] {
  // 计算最大 sortOrder
  const episodesWithSortOrder = episodes.filter(ep => ep.sortOrder !== null && ep.sortOrder !== undefined);

  if (episodesWithSortOrder.length === 0) {
    return episodes;
  }

  const maxSortOrder = Math.max(...episodesWithSortOrder.map(ep => ep.sortOrder!));

  return episodes.map(ep => {
    // 如果有 sortOrder,则根据 sortOrder 生成 pubDate
    if (ep.sortOrder !== null && ep.sortOrder !== undefined) {
      return {
        ...ep,
        pubDate: generatePubDateFromSortOrder(ep.sortOrder, baseDate, maxSortOrder),
      };
    }
    // 否则保留原有 pubDate
    return ep;
  });
}
