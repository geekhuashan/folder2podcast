/**
 * 中文转拼音工具
 * 用于将中文文本转换为符合 dirName 规范的拼音字符串
 */

import { pinyin } from 'pinyin-pro';

/**
 * 将中文文本转换为拼音（无音调）
 * 转换规则：
 * 1. 中文字符转换为拼音，用短横线连接
 * 2. 只保留字母、数字、短横线
 * 3. 删除所有其他特殊字符（空格、下划线、标点符号等）
 * 4. 转换为小写
 * 5. 限制长度为 50 字符
 *
 * @param text - 输入文本（可包含中文、英文、数字、特殊字符）
 * @returns 转换后的拼音字符串
 *
 * @example
 * chineseToPinyin("盲冢") // => "mang-zhong"
 * chineseToPinyin("Tech_播客#2024") // => "tech-bo-ke-2024"
 * chineseToPinyin("我的 播客!") // => "wo-de-bo-ke"
 */
export function chineseToPinyin(text: string): string {
  if (!text || text.trim() === '') {
    return '';
  }

  // 使用 pinyin-pro 转换中文为拼音（无音调，用短横线连接）
  const converted = pinyin(text, {
    toneType: 'none',     // 无音调
    type: 'array',        // 返回数组格式
    nonZh: 'consecutive', // 非中文字符连续输出
  });

  // 将数组连接成字符串，用短横线分隔
  let result = converted.join('-');

  // 转换为小写
  result = result.toLowerCase();

  // 只保留字母、数字、短横线，删除所有其他字符
  result = result.replace(/[^a-z0-9-]/g, '');

  // 清理多余的短横线
  result = result
    .replace(/^-+|-+$/g, '')    // 删除首尾的短横线
    .replace(/-{2,}/g, '-');    // 将连续的短横线合并为一个

  // 限制长度为 50 字符
  if (result.length > 50) {
    result = result.substring(0, 50);
    // 如果截断后末尾是短横线，删除
    result = result.replace(/-+$/, '');
  }

  return result;
}

/**
 * 生成随机字符串（用于 dirName 去重）
 * @param length - 字符串长度（默认 4）
 * @returns 随机字符串（小写字母和数字）
 *
 * @example
 * generateRandomString(4) // => "a7f3"
 */
function generateRandomString(length: number = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成带随机后缀的唯一 dirName
 * 用于处理重复的 dirName（在调用方检测到重复时使用）
 *
 * @param baseText - 原始文本
 * @returns 带 4 位随机后缀的 dirName
 *
 * @example
 * generateUniqueDirName("盲冢") // => "mang-zhong-a7f3"
 */
export function generateUniqueDirName(baseText: string): string {
  const base = chineseToPinyin(baseText);
  const randomSuffix = generateRandomString(4);

  // 如果 base 为空，使用时间戳作为基础
  if (!base) {
    return `podcast-${randomSuffix}`;
  }

  return `${base}-${randomSuffix}`;
}

/**
 * 验证 dirName 是否符合规范
 * 规范：只允许小写字母、数字、短横线，长度 1-100 字符
 *
 * @param dirName - 要验证的目录名
 * @returns 是否有效
 *
 * @example
 * isValidDirName("mang-zhong") // => true
 * isValidDirName("Mang_Zhong") // => false
 * isValidDirName("盲冢") // => false
 */
export function isValidDirName(dirName: string): boolean {
  if (!dirName || typeof dirName !== 'string') {
    return false;
  }

  // 长度检查
  if (dirName.length < 1 || dirName.length > 100) {
    return false;
  }

  // 格式检查：只允许小写字母、数字、短横线
  const validPattern = /^[a-z0-9-]+$/;
  return validPattern.test(dirName);
}
