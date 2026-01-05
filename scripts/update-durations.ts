/**
 * 更新所有剧集的 duration
 * 使用 ffprobe 重新提取音频时长并更新数据库
 */

import { db } from '../lib/db';
import { episodes, podcasts } from '../lib/db/schema';
import { extractMetadataFromFile } from '../lib/utils/audio';
import { getLocalPath } from '../lib/utils/url';
import { eq } from 'drizzle-orm';
import { join } from 'path';

async function updateDurations() {
  console.log('开始更新所有剧集的 duration...\n');

  // 1. 获取所有剧集
  const allEpisodes = await db.select().from(episodes).all();
  console.log(`找到 ${allEpisodes.length} 个剧集\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const episode of allEpisodes) {
    try {
      // 获取播客信息
      const podcast = await db
        .select()
        .from(podcasts)
        .where(eq(podcasts.id, episode.podcastId))
        .limit(1)
        .get();

      if (!podcast) {
        console.log(`  ⚠️  跳过: ${episode.fileName} (播客不存在)`);
        skipped++;
        continue;
      }

      // 如果已经有 duration，跳过
      if (episode.duration && episode.duration > 0) {
        console.log(`  ✓  跳过: ${episode.fileName} (已有 duration: ${episode.duration}秒)`);
        skipped++;
        continue;
      }

      // 构建文件路径
      const filePath = join(
        process.cwd(),
        getLocalPath(podcast.userId, podcast.dirName, episode.fileName)
      );

      console.log(`  处理: ${episode.fileName}`);

      // 提取元数据
      const metadata = await extractMetadataFromFile(filePath);

      if (metadata.duration > 0) {
        // 更新数据库
        await db
          .update(episodes)
          .set({ duration: metadata.duration })
          .where(eq(episodes.id, episode.id))
          .run();

        const minutes = Math.floor(metadata.duration / 60);
        const seconds = metadata.duration % 60;
        console.log(`    ✓  更新成功: ${metadata.duration}秒 (${minutes}:${seconds.toString().padStart(2, '0')})`);
        updated++;
      } else {
        console.log(`    ✗  提取失败: duration 为 0`);
        failed++;
      }
    } catch (error) {
      console.log(`    ✗  错误: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log('\n---');
  console.log(`更新完成:`);
  console.log(`  成功: ${updated} 个`);
  console.log(`  失败: ${failed} 个`);
  console.log(`  跳过: ${skipped} 个`);
}

updateDurations().catch(console.error);
