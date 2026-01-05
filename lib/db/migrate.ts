import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';

/**
 * 运行数据库迁移
 */
async function runMigrations() {
  console.log('🗄️  正在运行数据库迁移...');

  try {
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('✅ 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

runMigrations();
