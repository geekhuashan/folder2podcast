/**
 * 文件路径处理工具
 * 用于扁平化嵌套文件夹结构
 */

/**
 * 清理文件名中的非法字符
 * Windows/macOS 不允许的字符: < > : " / \ | ? *
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*]/g, '-');
}

/**
 * 将嵌套路径转换为扁平化文件名
 * 规则：使用 "-" 连接所有路径段
 *
 * @param relativePath - 相对路径（例如: "第一季/001.mp3"）
 * @param maxSegments - 最大路径段数，防止文件名过长（默认 5）
 * @returns 扁平化文件名（例如: "第一季-001.mp3"）
 *
 * @example
 * flattenPath("001.mp3") // => "001.mp3"
 * flattenPath("第一季/001.mp3") // => "第一季-001.mp3"
 * flattenPath("第一季/上半部/001.mp3") // => "第一季-上半部-001.mp3"
 * flattenPath("a/b/c/d/e/f.mp3", 3) // => "a-b-f.mp3" (限制最大段数)
 */
export function flattenPath(
  relativePath: string,
  maxSegments: number = 5
): string {
  // 规范化路径分隔符（兼容 Windows 和 Unix）
  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(s => s.length > 0);

  // 顶层文件直接返回
  if (segments.length === 1) {
    return sanitizeFileName(segments[0]);
  }

  // 限制最大段数（防止文件名过长）
  // 策略：保留前 maxSegments-1 段 + 最后一段（文件名）
  const limitedSegments = segments.length > maxSegments
    ? [...segments.slice(0, maxSegments - 1), segments[segments.length - 1]]
    : segments;

  // 使用 "-" 连接所有段
  return sanitizeFileName(limitedSegments.join('-'));
}

/**
 * 检测并解决文件名冲突
 *
 * @param flattenedName - 扁平化文件名
 * @param existingNames - 已存在的文件名集合
 * @returns 唯一的文件名（如有冲突会添加数字后缀）
 *
 * @example
 * resolveNameConflict("001.mp3", new Set(["002.mp3"])) // => "001.mp3"
 * resolveNameConflict("001.mp3", new Set(["001.mp3"])) // => "001-2.mp3"
 * resolveNameConflict("001.mp3", new Set(["001.mp3", "001-2.mp3"])) // => "001-3.mp3"
 */
export function resolveNameConflict(
  flattenedName: string,
  existingNames: Set<string>
): string {
  if (!existingNames.has(flattenedName)) {
    return flattenedName;
  }

  // 提取文件名和扩展名
  const lastDotIndex = flattenedName.lastIndexOf('.');
  const baseName = lastDotIndex > 0
    ? flattenedName.substring(0, lastDotIndex)
    : flattenedName;
  const extension = lastDotIndex > 0
    ? flattenedName.substring(lastDotIndex)
    : '';

  // 尝试添加数字后缀
  let counter = 2;
  let newName = `${baseName}-${counter}${extension}`;

  while (existingNames.has(newName)) {
    counter++;
    newName = `${baseName}-${counter}${extension}`;
  }

  return newName;
}
