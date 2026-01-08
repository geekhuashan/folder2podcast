import { db } from '@/lib/db';
import { podcasts, episodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { copyDefaultCoverToPodcast, copyPodcastCoverToEpisode, hasPodcastCover } from '@/lib/utils/cover';

/**
 * 为所有剧集生成独立的封面文件
 *
 * 工作流程：
 * 1. 遍历所有播客
 * 2. 确保每个播客有封面（没有就复制默认封面）
 * 3. 为每个剧集创建独立的封面文件（ep-{episodeId}.jpg）
 * 4. 更新数据库中的 coverFileName 字段
 */
async function migrateEpisodeCovers() {
  console.log('开始迁移剧集封面...\n');

  const allPodcasts = await db.select().from(podcasts).all();

  console.log(`找到 ${allPodcasts.length} 个播客\n`);

  let podcastsProcessed = 0;
  let podcastsFailed = 0;
  let episodesProcessed = 0;
  let episodesFailed = 0;

  for (const podcast of allPodcasts) {
    console.log(`处理播客: ${podcast.dirName} (${podcast.title})`);

    try {
      // 1. 确保播客有封面
      if (!await hasPodcastCover(podcast.userId, podcast.dirName)) {
        await copyDefaultCoverToPodcast(podcast.userId, podcast.dirName);
        console.log(`  ✅ 创建了默认播客封面`);
      } else {
        console.log(`  ⏭️  播客封面已存在`);
      }

      // 2. 获取所有剧集
      const allEpisodes = await db.select()
        .from(episodes)
        .where(eq(episodes.podcastId, podcast.id))
        .all();

      console.log(`  找到 ${allEpisodes.length} 个剧集`);

      // 3. 为每个剧集创建封面
      for (const episode of allEpisodes) {
        try {
          // 复制播客封面为剧集封面
          const newCoverFileName = await copyPodcastCoverToEpisode(
            podcast.userId,
            podcast.dirName,
            episode.id
          );

          // 更新数据库
          await db.update(episodes)
            .set({ coverFileName: newCoverFileName })
            .where(eq(episodes.id, episode.id));

          episodesProcessed++;
          console.log(`    ✅ ${episode.title}: ${newCoverFileName}`);
        } catch (err) {
          episodesFailed++;
          console.error(`    ❌ ${episode.title}: 失败 -`, err);
        }
      }

      podcastsProcessed++;
      console.log(`  完成！\n`);
    } catch (err) {
      podcastsFailed++;
      console.error(`  ❌ 播客处理失败:`, err);
      console.log('');
    }
  }

  console.log(`\n========== 迁移完成 ==========`);
  console.log(`播客处理成功: ${podcastsProcessed}`);
  console.log(`播客处理失败: ${podcastsFailed}`);
  console.log(`剧集处理成功: ${episodesProcessed}`);
  console.log(`剧集处理失败: ${episodesFailed}`);
  console.log(`================================\n`);
}

// 运行迁移
migrateEpisodeCovers()
  .then(() => {
    console.log('迁移脚本执行完毕');
    process.exit(0);
  })
  .catch((err) => {
    console.error('迁移脚本执行失败:', err);
    process.exit(1);
  });
