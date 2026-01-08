import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { generateAccessKey } from '@/lib/middleware/auth';

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
 * 从环境变量创建初始管理员用户（如果指定了且不存在）
 */
async function createInitialAdminFromEnv() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  // 如果没有提供用户名或密码，跳过创建
  if (!username || !password) {
    console.log('ℹ️  未提供 ADMIN_USERNAME 和 ADMIN_PASSWORD，跳过初始管理员创建');
    console.log('   用户需要通过注册页面自行注册');
    return;
  }

  try {
    // 检查用户是否已存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (existingUser) {
      console.log(`👤 用户 "${username}" 已存在，跳过创建`);
      return;
    }

    console.log(`👤 创建初始管理员用户: ${username}...`);

    // 生成 Access Key
    const accessKey = generateAccessKey();

    // 创建管理员用户
    await db
      .insert(users)
      .values({
        id: username,
        username,
        accessKey,
        password,
      })
      .returning()
      .get();

    console.log('✅ 初始管理员用户创建成功！');
    console.log('');
    console.log('  登录信息：');
    console.log(`    用户名: ${username}`);
    console.log(`    密码: ${password}`);
    console.log('');
    console.log('  Access Key（用于 API 调用）：');
    console.log(`    ${accessKey}`);
    console.log('');
  } catch (error) {
    console.error('❌ 创建初始管理员用户失败:', error);
    // 不中断启动流程，只是记录错误
  }
}

/**
 * 初始化数据库
 */
async function initDatabase() {
  await runMigrations();
  await createInitialAdminFromEnv();
}

initDatabase();
