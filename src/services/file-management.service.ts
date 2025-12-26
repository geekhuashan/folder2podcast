import path from 'path';
import { getStorage } from './storage';
import type { IStorage } from './storage';

// 支持的音频文件格式
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.opus'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 文件管理服务
 * 提供文件上传、下载、删除、重命名等功能
 * 支持本地存储和 S3 存储
 */
export class FileManagementService {
    private storage: IStorage;

    constructor(storage?: IStorage) {
        // 允许注入存储实例（便于测试），否则使用全局实例
        this.storage = storage || getStorage();
    }

    /**
     * 检查文件路径是否安全(防止路径穿越攻击)
     */
    private isSafePath(relativePath: string): boolean {
        const normalized = path.normalize(relativePath);
        // 禁止包含 .. 或绝对路径
        return !normalized.startsWith('..') && !path.isAbsolute(normalized);
    }

    /**
     * 构建相对路径（audio/userId/podcastDir/fileName）
     */
    private buildRelativePath(userId: string, podcastDir: string, fileName?: string): string {
        const parts = ['audio', userId, podcastDir];
        if (fileName) {
            parts.push(fileName);
        }
        return parts.join('/');
    }

    /**
     * 检查文件类型是否为音频或图片
     */
    private isValidFileType(fileName: string): { valid: boolean; type: 'audio' | 'image' | 'unknown' } {
        const ext = path.extname(fileName).toLowerCase();
        if (AUDIO_EXTENSIONS.includes(ext)) {
            return { valid: true, type: 'audio' };
        }
        if (IMAGE_EXTENSIONS.includes(ext)) {
            return { valid: true, type: 'image' };
        }
        return { valid: false, type: 'unknown' };
    }

    /**
     * 列出播客目录下的所有文件（仅扫描根目录）
     */
    async listFiles(userId: string, podcastDir: string): Promise<{
        audio: string[];
        images: string[];
        others: string[];
    }> {
        const dirPath = this.buildRelativePath(userId, podcastDir);

        if (!await this.storage.directoryExists(dirPath)) {
            throw new Error(`Podcast directory not found: ${podcastDir}`);
        }

        const result = {
            audio: [] as string[],
            images: [] as string[],
            others: [] as string[]
        };

        const files = await this.storage.listFiles(dirPath, { recursive: false });

        for (const fileName of files) {
            // 跳过隐藏文件
            if (fileName.startsWith('.')) {
                continue;
            }

            const { type } = this.isValidFileType(fileName);
            if (type === 'audio') {
                result.audio.push(fileName);
            } else if (type === 'image') {
                result.images.push(fileName);
            } else {
                result.others.push(fileName);
            }
        }

        return result;
    }

    /**
     * 删除文件
     */
    async deleteFile(userId: string, podcastDir: string, fileName: string): Promise<void> {
        const relativePath = this.buildRelativePath(userId, podcastDir, fileName);

        if (!this.isSafePath(relativePath)) {
            throw new Error('Invalid file path');
        }

        if (!await this.storage.fileExists(relativePath)) {
            throw new Error(`File not found: ${fileName}`);
        }

        await this.storage.deleteFile(relativePath);
    }

    /**
     * 重命名文件
     */
    async renameFile(userId: string, podcastDir: string, oldName: string, newName: string): Promise<void> {
        const oldPath = this.buildRelativePath(userId, podcastDir, oldName);
        const newPath = this.buildRelativePath(userId, podcastDir, newName);

        if (!this.isSafePath(oldPath) || !this.isSafePath(newPath)) {
            throw new Error('Invalid file path');
        }

        if (!await this.storage.fileExists(oldPath)) {
            throw new Error(`File not found: ${oldName}`);
        }

        if (await this.storage.fileExists(newPath)) {
            throw new Error(`File already exists: ${newName}`);
        }

        await this.storage.moveFile(oldPath, newPath);
    }

    /**
     * 保存上传的文件
     */
    async saveFile(userId: string, podcastDir: string, fileName: string, fileBuffer: Buffer): Promise<void> {
        // 检查文件类型
        const { valid } = this.isValidFileType(fileName);
        if (!valid) {
            throw new Error(`Invalid file type. Supported types: ${[...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS].join(', ')}`);
        }

        const relativePath = this.buildRelativePath(userId, podcastDir, fileName);

        if (!this.isSafePath(relativePath)) {
            throw new Error('Invalid file path');
        }

        // 确保目录存在
        const dirPath = this.buildRelativePath(userId, podcastDir);
        await this.storage.ensureDirectory(dirPath);

        // 检查文件是否已存在
        if (await this.storage.fileExists(relativePath)) {
            throw new Error(`File already exists: ${fileName}`);
        }

        // 保存文件
        await this.storage.saveFile(relativePath, fileBuffer);
    }

    /**
     * 获取文件的相对路径
     * 注意：S3 模式下不返回绝对路径，返回相对路径
     */
    getFilePath(userId: string, podcastDir: string, fileName: string): string {
        const relativePath = this.buildRelativePath(userId, podcastDir, fileName);
        if (!this.isSafePath(relativePath)) {
            throw new Error('Invalid file path');
        }
        return relativePath;
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(userId: string, podcastDir: string, fileName: string): Promise<boolean> {
        const relativePath = this.buildRelativePath(userId, podcastDir, fileName);
        if (!this.isSafePath(relativePath)) {
            return false;
        }
        return await this.storage.fileExists(relativePath);
    }

    /**
     * 创建新的播客文件夹
     */
    async createPodcast(userId: string, podcastDir: string, initialConfig?: any): Promise<void> {
        // 验证文件夹名称（防止特殊字符和路径穿越）
        if (!podcastDir || podcastDir.includes('..') || podcastDir.includes('/') || podcastDir.includes('\\')) {
            throw new Error('Invalid podcast directory name');
        }

        const dirPath = this.buildRelativePath(userId, podcastDir);

        // 检查目录是否已存在
        if (await this.storage.directoryExists(dirPath)) {
            throw new Error(`Podcast directory already exists: ${podcastDir}`);
        }

        // 创建目录
        await this.storage.ensureDirectory(dirPath);

        // 如果提供了初始配置，创建 podcast.json
        // 注意：V2 架构已将配置迁移到数据库，这里保留兼容性
        if (initialConfig) {
            const configPath = this.buildRelativePath(userId, podcastDir, 'podcast.json');
            const configBuffer = Buffer.from(JSON.stringify(initialConfig, null, 2));
            await this.storage.saveFile(configPath, configBuffer);
        }
    }

    /**
     * 检查播客目录是否存在
     */
    async podcastExists(userId: string, podcastDir: string): Promise<boolean> {
        const dirPath = this.buildRelativePath(userId, podcastDir);
        return await this.storage.directoryExists(dirPath);
    }

    /**
     * 删除整个播客目录
     */
    async deletePodcast(userId: string, podcastDir: string): Promise<void> {
        // 验证文件夹名称（防止特殊字符和路径穿越）
        if (!podcastDir || podcastDir.includes('..') || podcastDir.includes('/') || podcastDir.includes('\\')) {
            throw new Error('Invalid podcast directory name');
        }

        const dirPath = this.buildRelativePath(userId, podcastDir);

        // 检查目录是否存在
        if (!await this.storage.directoryExists(dirPath)) {
            throw new Error(`Podcast directory not found: ${podcastDir}`);
        }

        // 删除整个目录及其所有内容
        await this.storage.deleteDirectory(dirPath);
    }

    /**
     * 读取文件内容
     */
    async readFile(userId: string, podcastDir: string, fileName: string): Promise<Buffer> {
        const relativePath = this.buildRelativePath(userId, podcastDir, fileName);
        if (!this.isSafePath(relativePath)) {
            throw new Error('Invalid file path');
        }
        return await this.storage.readFile(relativePath);
    }

    /**
     * 获取文件 URL
     */
    getFileUrl(userId: string, podcastDir: string, fileName: string): string {
        const relativePath = this.buildRelativePath(userId, podcastDir, fileName);
        return this.storage.getFileUrl(relativePath);
    }

    /**
     * 获取存储类型
     */
    getStorageType(): 'local' | 's3' {
        return this.storage.getStorageType();
    }
}
