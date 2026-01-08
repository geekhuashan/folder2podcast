#!/usr/bin/env tsx
/**
 * 重置脚本 - 清理所有测试数据和临时文件
 * 用法: npm run reset
 */

import { rmSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = join(__dirname, '..');

// 需要完全删除的目录和文件
const TO_DELETE = [
  'data/podcasts.db',
  'data/podcasts.db-wal',
  'data/podcasts.db-shm',
  'lib/db/podcast.db',
  '.next',
  'node_modules/.cache',
];

// 需要清空内容但保留目录的路径
const TO_CLEAN = [
  'audio',
];

console.log('🧹 开始重置项目...\n');

// 删除文件和目录
console.log('📁 删除临时文件和缓存...');
for (const item of TO_DELETE) {
  const fullPath = join(ROOT_DIR, item);
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✅ 已删除: ${item}`);
    } catch (error) {
      console.error(`  ❌ 删除失败: ${item}`, error);
    }
  } else {
    console.log(`  ⏭️  不存在: ${item}`);
  }
}

console.log('\n📂 清空上传目录...');
for (const dir of TO_CLEAN) {
  const fullPath = join(ROOT_DIR, dir);
  if (existsSync(fullPath)) {
    try {
      // 获取目录中所有文件（排除 .gitkeep）
      const files = readdirSync(fullPath);
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = join(fullPath, file);
          rmSync(filePath, { recursive: true, force: true });
          console.log(`  ✅ 已删除: ${dir}/${file}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ 清空失败: ${dir}`, error);
    }
  } else {
    // 如果目录不存在，创建它
    mkdirSync(fullPath, { recursive: true });
    console.log(`  ✅ 已创建: ${dir}/`);
  }
}

// 重新初始化数据库
console.log('\n🗄️  重新初始化数据库...');
try {
  const dataDir = join(ROOT_DIR, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('  ✅ 已创建 data/ 目录');
  }

  // 自动运行数据库迁移
  console.log('  🚀 正在运行数据库迁移...');
  execSync('npm run db:migrate', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  console.log('  ✅ 数据库表结构已创建');
} catch (error) {
  console.error('  ❌ 数据库初始化失败:', error);
  process.exit(1);
}

console.log('\n✨ 重置完成！你现在可以运行 npm run dev 启动干净的开发环境。\n');
