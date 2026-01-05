import { db } from './index';
import { users } from './schema';
import { v4 as uuidv4 } from 'uuid';
import { generateAccessKey } from '@/lib/middleware/auth';

/**
 * 创建测试用户
 * 使用方法：npm run create-user
 */

async function createTestUser() {
  const username = process.argv[2] || 'testuser';

  try {
    // 生成 Access Key
    const accessKey = generateAccessKey();

    // 创建用户（直接使用 username 作为 userId）
    const user = await db
      .insert(users)
      .values({
        id: username,
        username,
        accessKey,
      })
      .returning()
      .get();

    console.log('✅ 用户创建成功！');
    console.log('');
    console.log('用户信息：');
    console.log(`  用户名: ${user.username}`);
    console.log(`  用户ID: ${user.id}`);
    console.log('');
    console.log('Access Key（请妥善保管）：');
    console.log(`  ${user.accessKey}`);
    console.log('');
    console.log('使用示例：');
    console.log(`  curl -H "Authorization: Bearer ${user.accessKey}" \\`);
    console.log(`       http://localhost:3000/api/v1/podcasts`);
    console.log('');
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    process.exit(1);
  }
}

createTestUser();
