/**
 * 存储服务统一接口
 * 支持本地存储和 S3 存储两种实现
 */

/**
 * 文件统计信息
 */
export interface FileStats {
  size: number;           // 文件大小（字节）
  createdAt: Date;        // 创建时间
  modifiedAt: Date;       // 修改时间
  isDirectory: boolean;   // 是否为目录
}

/**
 * 存储服务接口
 * 提供文件和目录的基本操作抽象
 */
export interface IStorage {
  /**
   * 保存文件
   * @param relativePath 相对路径（如 "audio/admin/my-podcast/episode01.mp3"）
   * @param data 文件数据
   */
  saveFile(relativePath: string, data: Buffer): Promise<void>;

  /**
   * 读取文件
   * @param relativePath 相对路径
   * @returns 文件数据
   */
  readFile(relativePath: string): Promise<Buffer>;

  /**
   * 删除文件
   * @param relativePath 相对路径
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * 检查文件是否存在
   * @param relativePath 相对路径
   * @returns 是否存在
   */
  fileExists(relativePath: string): Promise<boolean>;

  /**
   * 列出目录下的文件
   * @param dirPath 目录相对路径
   * @param options 可选配置（如是否递归）
   * @returns 文件路径列表（相对于 dirPath）
   */
  listFiles(dirPath: string, options?: { recursive?: boolean }): Promise<string[]>;

  /**
   * 删除目录及其所有内容
   * @param dirPath 目录相对路径
   */
  deleteDirectory(dirPath: string): Promise<void>;

  /**
   * 获取文件的公开访问 URL
   * @param relativePath 相对路径
   * @returns 公开访问 URL
   */
  getFileUrl(relativePath: string): string;

  /**
   * 获取文件大小
   * @param relativePath 相对路径
   * @returns 文件大小（字节）
   */
  getFileSize(relativePath: string): Promise<number>;

  /**
   * 获取文件统计信息
   * @param relativePath 相对路径
   * @returns 文件统计信息
   */
  getFileStats(relativePath: string): Promise<FileStats>;

  /**
   * 检查目录是否存在
   * @param dirPath 目录相对路径
   * @returns 是否存在
   */
  directoryExists(dirPath: string): Promise<boolean>;

  /**
   * 创建目录（递归创建父目录）
   * @param dirPath 目录相对路径
   */
  ensureDirectory(dirPath: string): Promise<void>;

  /**
   * 复制文件
   * @param sourcePath 源文件相对路径
   * @param destPath 目标文件相对路径
   */
  copyFile(sourcePath: string, destPath: string): Promise<void>;

  /**
   * 移动/重命名文件
   * @param sourcePath 源文件相对路径
   * @param destPath 目标文件相对路径
   */
  moveFile(sourcePath: string, destPath: string): Promise<void>;

  /**
   * 获取存储类型
   * @returns 'local' | 's3'
   */
  getStorageType(): 'local' | 's3';
}
