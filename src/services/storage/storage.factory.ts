import { IStorage } from './storage.interface';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';
import { getEnvConfig } from '../../utils/env';

/**
 * 存储工厂
 * 根据环境变量 STORAGE_MODE 创建对应的存储实例
 */
export class StorageFactory {
  private static instance: IStorage | null = null;

  /**
   * 获取存储实例（单例模式）
   */
  static getInstance(): IStorage {
    if (!this.instance) {
      this.instance = this.createStorage();
    }
    return this.instance;
  }

  /**
   * 创建存储实例
   */
  private static createStorage(): IStorage {
    const env = getEnvConfig();
    const storageMode = env.STORAGE_MODE || 'local';

    console.log(`[StorageFactory] 初始化存储模式: ${storageMode}`);

    switch (storageMode) {
      case 'local':
        return new LocalStorage();

      case 's3':
        return new S3Storage();

      default:
        throw new Error(`不支持的存储模式: ${storageMode}。支持的模式: local, s3`);
    }
  }

  /**
   * 重置实例（用于测试或动态切换存储模式）
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * 导出便捷函数：获取全局存储实例
 */
export function getStorage(): IStorage {
  return StorageFactory.getInstance();
}
