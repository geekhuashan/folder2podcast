/**
 * 修复 episodes.json 中的占位标题（P6, P7 等）
 *
 * 使用场景：
 * - BBDown -info 输出不完整导致的占位标题（如 "P6", "P7"）
 * - 从文件名提取真实标题：[P06]6.梯田＋爸我回来了.m4a => 6.梯田＋爸我回来了
 *
 * 用法：
 *   npx ts-node scripts/fix-placeholder-titles.ts <播客目录路径>
 *
 * 示例：
 *   npx ts-node scripts/fix-placeholder-titles.ts audio/admin/1614
 */

import fs from 'fs-extra';
import path from 'path';
import { extractTitleFromFileName } from '../src/adapters/bilibili/bbdown.utils';

interface EpisodeMetadata {
    title?: string;
    description?: string;
    pubDate?: string;
    image?: string;
}

interface EpisodesConfig {
    episodes: Record<string, EpisodeMetadata>;
}

/**
 * 检查标题是否为占位符（如 "P6", "P7" 等）
 */
function isPlaceholderTitle(title: string): boolean {
    return /^P\d+$/i.test(title);
}

/**
 * 修复单个播客目录的 episodes.json
 *
 * @param podcastDir - 播客目录路径
 */
async function fixPodcastEpisodes(podcastDir: string): Promise<void> {
    const episodesJsonPath = path.join(podcastDir, 'episodes.json');

    // 检查文件是否存在
    if (!await fs.pathExists(episodesJsonPath)) {
        console.log(`❌ 未找到 episodes.json: ${episodesJsonPath}`);
        return;
    }

    // 读取现有配置
    let config: EpisodesConfig;
    try {
        const content = await fs.readFile(episodesJsonPath, 'utf-8');
        config = JSON.parse(content);
    } catch (error) {
        console.error(`❌ 读取 episodes.json 失败: ${error}`);
        return;
    }

    // 统计
    let fixedCount = 0;
    let skippedCount = 0;

    // 遍历所有剧集
    for (const [fileName, metadata] of Object.entries(config.episodes)) {
        const title = metadata.title;

        // 如果标题是占位符，尝试从文件名提取真实标题
        if (title && isPlaceholderTitle(title)) {
            const extractedTitle = extractTitleFromFileName(fileName);

            if (extractedTitle) {
                console.log(`✅ 修复: ${fileName}`);
                console.log(`   旧标题: ${title}`);
                console.log(`   新标题: ${extractedTitle}`);

                // 更新标题
                config.episodes[fileName].title = extractedTitle;
                fixedCount++;
            } else {
                console.log(`⚠️  无法提取标题: ${fileName} (保持占位符: ${title})`);
                skippedCount++;
            }
        }
    }

    // 如果有修复，保存文件
    if (fixedCount > 0) {
        await fs.writeFile(episodesJsonPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`\n✅ 已修复 ${fixedCount} 个剧集标题`);
    }

    if (skippedCount > 0) {
        console.log(`⚠️  跳过 ${skippedCount} 个无法提取的标题`);
    }

    if (fixedCount === 0 && skippedCount === 0) {
        console.log(`✨ 未发现占位标题，无需修复`);
    }
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error(`用法: npx ts-node scripts/fix-placeholder-titles.ts <播客目录路径>`);
        console.error(`示例: npx ts-node scripts/fix-placeholder-titles.ts audio/admin/1614`);
        process.exit(1);
    }

    const podcastDir = args[0];

    // 检查目录是否存在
    if (!await fs.pathExists(podcastDir)) {
        console.error(`❌ 目录不存在: ${podcastDir}`);
        process.exit(1);
    }

    console.log(`\n🔧 开始修复占位标题: ${podcastDir}\n`);

    await fixPodcastEpisodes(podcastDir);

    console.log(`\n✅ 完成！\n`);
}

// 执行主函数
main().catch(error => {
    console.error(`❌ 脚本执行失败:`, error);
    process.exit(1);
});
