import fs from 'fs-extra';
import path from 'path';
import { IStorage, FileStats } from './storage.interface';
import { getEnvConfig } from '../../utils/env';

/**
 * 本地文件系统存储实现
 * 使用本地磁盘存储所有文件
 */
export class LocalStorage implements IStorage {
  private readonly baseDir: string;  // 基础目录（AUDIO_DIR）
  private readonly baseUrl: string;  // 基础 URL（BASE_URL）

  constructor() {
    const env = getEnvConfig();
    this.baseDir = env.AUDIO_DIR;
    this.baseUrl = env.BASE_URL;
  }

  /**
   * 将相对路径转换为绝对路径
   */
  private getAbsolutePath(relativePath: string): string {
    // 安全检查：防止路径穿越攻击
    let normalizedPath = path.normalize(relativePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      throw new Error(`非法路径: ${relativePath}`);
    }

    // 移除 'audio/' 前缀（如果存在）
    // 因为 baseDir 已经是 audio 目录了
    if (normalizedPath.startsWith('audio/') || normalizedPath.startsWith('audio\\')) {
      normalizedPath = normalizedPath.substring(6);
    }

    return path.join(this.baseDir, normalizedPath);
  }

  /**
   * 保存文件
   */
  async saveFile(relativePath: string, data: Buffer): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    // 确保父目录存在
    await fs.ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, data);
  }

  /**
   * 读取文件
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const absolutePath = this.getAbsolutePath(relativePath);
    return await fs.readFile(absolutePath);
  }

  /**
   * 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    await fs.remove(absolutePath);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(relativePath);
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 列出目录下的文件
   */
  async listFiles(dirPath: string, options?: { recursive?: boolean }): Promise<string[]> {
    const absolutePath = this.getAbsolutePath(dirPath);

    if (!await fs.pathExists(absolutePath)) {
      return [];
    }

    const stat = await fs.stat(absolutePath);
    if (!stat.isDirectory()) {
      return [];
    }

    const files: string[] = [];

    if (options?.recursive) {
      // 递归列出所有文件
      const walk = async (dir: string, baseDir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          if (entry.isDirectory()) {
            await walk(fullPath, baseDir);
          } else if (entry.isFile()) {
            files.push(relativePath);
          }
        }
      };
      await walk(absolutePath, absolutePath);
    } else {
      // 只列出当前目录的文件
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(entry.name);
        }
      }
    }

    return files;
  }

  /**
   * 删除目录及其所有内容
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(dirPath);
    await fs.remove(absolutePath);
  }

  /**
   * 获取文件的公开访问 URL
   * 格式：{BASE_URL}/audio/{podcastName}/{fileName}
   */
  getFileUrl(relativePath: string): string {
    // 移除开头的 "audio/" 前缀（如果存在）
    let urlPath = relativePath;
    if (urlPath.startsWith('audio/')) {
      urlPath = urlPath.substring(6); // 移除 "audio/"
    }

    // 移除 userId 目录层级（格式：userId/podcastName/fileName）
    const parts = urlPath.split('/');
    if (parts.length >= 3) {
      // 跳过第一部分（userId），保留 podcastName/fileName
      urlPath = parts.slice(1).join('/');
    }

    // 返回公开 URL
    return `${this.baseUrl}/audio/${urlPath}`;
  }

  /**
   * 获取文件大小
   */
  async getFileSize(relativePath: string): Promise<number> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const stat = await fs.stat(absolutePath);
    return stat.size;
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(relativePath: string): Promise<FileStats> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const stat = await fs.stat(absolutePath);

    return {
      size: stat.size,
      createdAt: stat.birthtime,
      modifiedAt: stat.mtime,
      isDirectory: stat.isDirectory(),
    };
  }

  /**
   * 检查目录是否存在
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(dirPath);
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 创建目录（递归创建父目录）
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(dirPath);
    await fs.ensureDir(absolutePath);
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const sourceAbsolutePath = this.getAbsolutePath(sourcePath);
    const destAbsolutePath = this.getAbsolutePath(destPath);

    // 确保目标目录存在
    await fs.ensureDir(path.dirname(destAbsolutePath));
    await fs.copyFile(sourceAbsolutePath, destAbsolutePath);
  }

  /**
   * 移动/重命名文件
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const sourceAbsolutePath = this.getAbsolutePath(sourcePath);
    const destAbsolutePath = this.getAbsolutePath(destPath);

    // 确保目标目录存在
    await fs.ensureDir(path.dirname(destAbsolutePath));
    await fs.move(sourceAbsolutePath, destAbsolutePath, { overwrite: true });
  }

  /**
   * 获取存储类型
   */
  getStorageType(): 'local' | 's3' {
    return 'local';
  }
}
