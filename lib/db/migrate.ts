import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { generateAccessKey } from '@/lib/middleware/auth';
import { authConfig } from '@/lib/config';

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

/**
 * 从环境变量批量创建初始用户（如果指定了且不存在）
 */
async function createInitialUsersFromEnv() {
  const initialUsers = authConfig.initialUsers;

  if (initialUsers.length === 0) {
    console.log('ℹ️  开放注册模式：未提供初始用户配置');
    console.log('   用户需要通过注册页面自行注册');
    return;
  }

  console.log(`👤 检测到 ${initialUsers.length} 个初始用户，开始创建...`);

  for (const user of initialUsers) {
    try {
      // 检查用户是否已存在
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, user.username))
        .get();

      if (existingUser) {
        console.log(`  ⏭️  用户 "${user.username}" 已存在，跳过`);
        continue;
      }

      // 生成 Access Key
      const accessKey = generateAccessKey();

      // 创建用户
      await db
        .insert(users)
        .values({
          id: user.username,
          username: user.username,
          accessKey,
          password: user.password,
        })
        .returning()
        .get();

      console.log(`  ✅ 用户 "${user.username}" 创建成功`);
      console.log(`     Access Key: ${accessKey}`);
    } catch (error) {
      console.error(`  ❌ 创建用户 "${user.username}" 失败:`, error);
      // 不中断启动流程，继续创建其他用户
    }
  }

  // 显示注册状态
  if (!authConfig.enableRegistration) {
    console.log('');
    console.log('🔒 注册功能已关闭（固定用户模式）');
    console.log('   其他用户无法通过注册页面创建账号');
  }
}

/**
 * 初始化数据库
 */
async function initDatabase() {
  await runMigrations();
  await createInitialUsersFromEnv();
}

initDatabase();
