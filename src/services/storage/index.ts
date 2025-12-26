/**
 * 存储服务模块
 * 提供统一的存储抽象层，支持本地存储和 S3 存储
 */

export { IStorage, FileStats } from './storage.interface';
export { LocalStorage } from './local.storage';
export { S3Storage } from './s3.storage';
export { StorageFactory, getStorage } from './storage.factory';
