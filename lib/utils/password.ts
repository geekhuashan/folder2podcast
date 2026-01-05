/**
 * 密码加密工具
 * 使用 Node.js 内置 crypto 模块实现 PBKDF2 密码哈希
 */

import crypto from 'crypto';

/**
 * 生成随机盐值
 * @returns 16字节的随机盐值（十六进制字符串）
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 使用 PBKDF2 哈希密码
 * @param password - 原始密码
 * @param salt - 盐值
 * @returns 哈希后的密码（十六进制字符串）
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * 验证密码是否匹配
 * @param password - 待验证的原始密码
 * @param hash - 存储的密码哈希
 * @param salt - 存储的盐值
 * @returns 如果密码匹配则返回 true
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const newHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(newHash));
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
