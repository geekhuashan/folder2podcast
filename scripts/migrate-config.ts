#!/usr/bin/env ts-node
/**
 * CLI 工具:迁移 V1 配置文件到 V2 格式
 *
 * 使用方法:
 *   npx ts-node scripts/migrate-config.ts <podcasts-directory>
 *
 * 例如:
 *   npx ts-node scripts/migrate-config.ts /path/to/podcasts
 */

import fs from 'fs-extra';
import path from 'path';
import { migrateV1ToV2 } from '../src/utils/migration';
import { PodcastConfig, PodcastConfigV2 } from '../src/types';

async function migrateConfigFile(configPath: string): Promise<boolean> {
    try {
        // 读取现有配置
        const v1Config: PodcastConfig = await fs.readJSON(configPath);

        // 检查是否已经是 V2 格式
        if ('metadata' in v1Config || 'parsing' in v1Config) {
            console.log(`  ℹ️  Already V2 format: ${configPath}`);
            return false;
        }

        // 迁移到 V2
        const v2Config: PodcastConfigV2 = migrateV1ToV2(v1Config);

        // 备份原文件
        const backupPath = configPath + '.v1.backup';
        await fs.copy(configPath, backupPath);
        console.log(`  ✓ Backed up to: ${backupPath}`);

        // 写入 V2 配置
        await fs.writeJSON(configPath, v2Config, { spaces: 2 });
        console.log(`  ✓ Migrated: ${configPath}`);

        return true;
    } catch (error) {
        console.error(`  ✗ Error migrating ${configPath}:`, error);
        return false;
    }
}

async function migratePodcastsDirectory(podcastsDir: string): Promise<void> {
    console.log(`Scanning podcasts directory: ${podcastsDir}\n`);

    const entries = await fs.readdir(podcastsDir, { withFileTypes: true });
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const podcastDir = path.join(podcastsDir, entry.name);
        const configPath = path.join(podcastDir, 'podcast.json');

        // 检查配置文件是否存在
        if (!await fs.pathExists(configPath)) {
            console.log(`  - Skipping ${entry.name} (no podcast.json)`);
            skippedCount++;
            continue;
        }

        console.log(`Processing: ${entry.name}`);
        const migrated = await migrateConfigFile(configPath);

        if (migrated) {
            migratedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Migration Summary:`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped:  ${skippedCount}`);
    console.log(`  Errors:   ${errorCount}`);
    console.log(`${'='.repeat(50)}`);
}

// 主函数
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: npx ts-node scripts/migrate-config.ts <podcasts-directory>');
        process.exit(1);
    }

    const podcastsDir = path.resolve(args[0]);

    if (!await fs.pathExists(podcastsDir)) {
        console.error(`Error: Directory not found: ${podcastsDir}`);
        process.exit(1);
    }

    await migratePodcastsDirectory(podcastsDir);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
