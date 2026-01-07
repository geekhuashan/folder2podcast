/**
 * 密码验证工具
 * 使用明文存储和比较
 */

/**
 * 验证密码是否匹配
 * @param inputPassword - 用户输入的密码
 * @param storedPassword - 数据库存储的密码
 * @returns 如果密码匹配则返回 true
 */
export function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  return inputPassword === storedPassword;
}

/**
 * 验证密码格式
 * 要求：不为空
 * @param password - 待验证的密码
 * @returns 如果格式正确则返回 true
 */
export function validatePasswordFormat(password: string): boolean {
  return password.length > 0;
}
