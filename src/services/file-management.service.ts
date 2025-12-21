import fs from 'fs-extra';
import path from 'path';
import { getEnvConfig } from '../utils/env';

// 支持的音频文件格式
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.opus'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 文件管理服务
 * 提供文件上传、下载、删除、重命名等功能
 */
export class FileManagementService {
    private audioDir: string;

    constructor() {
        const config = getEnvConfig();
        this.audioDir = path.resolve(config.AUDIO_DIR);
    }

    /**
     * 检查文件路径是否安全(防止路径穿越攻击)
     */
    private isSafePath(podcastDir: string, fileName: string): boolean {
        const fullPath = path.resolve(this.audioDir, podcastDir, fileName);
        const expectedPrefix = path.resolve(this.audioDir, podcastDir);
        return fullPath.startsWith(expectedPrefix);
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
    async listFiles(podcastDir: string): Promise<{
        audio: string[];
        images: string[];
        others: string[];
    }> {
        const dirPath = path.join(this.audioDir, podcastDir);

        if (!await fs.pathExists(dirPath)) {
            throw new Error(`Podcast directory not found: ${podcastDir}`);
        }

        const result = {
            audio: [] as string[],
            images: [] as string[],
            others: [] as string[]
        };

        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            // 跳过隐藏文件和目录
            if (entry.name.startsWith('.')) {
                continue;
            }

            // 只处理文件，忽略子目录
            if (!entry.isFile()) {
                continue;
            }

            const { valid, type } = this.isValidFileType(entry.name);
            if (type === 'audio') {
                result.audio.push(entry.name);
            } else if (type === 'image') {
                result.images.push(entry.name);
            } else {
                result.others.push(entry.name);
            }
        }

        return result;
    }

    /**
     * 删除文件
     */
    async deleteFile(podcastDir: string, fileName: string): Promise<void> {
        if (!this.isSafePath(podcastDir, fileName)) {
            throw new Error('Invalid file path');
        }

        const filePath = path.join(this.audioDir, podcastDir, fileName);

        if (!await fs.pathExists(filePath)) {
            throw new Error(`File not found: ${fileName}`);
        }

        await fs.remove(filePath);
    }

    /**
     * 重命名文件
     */
    async renameFile(podcastDir: string, oldName: string, newName: string): Promise<void> {
        if (!this.isSafePath(podcastDir, oldName) || !this.isSafePath(podcastDir, newName)) {
            throw new Error('Invalid file path');
        }

        const oldPath = path.join(this.audioDir, podcastDir, oldName);
        const newPath = path.join(this.audioDir, podcastDir, newName);

        if (!await fs.pathExists(oldPath)) {
            throw new Error(`File not found: ${oldName}`);
        }

        if (await fs.pathExists(newPath)) {
            throw new Error(`File already exists: ${newName}`);
        }

        await fs.rename(oldPath, newPath);
    }

    /**
     * 保存上传的文件
     */
    async saveFile(podcastDir: string, fileName: string, fileBuffer: Buffer): Promise<void> {
        // 检查文件类型
        const { valid, type } = this.isValidFileType(fileName);
        if (!valid) {
            throw new Error(`Invalid file type. Supported types: ${[...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS].join(', ')}`);
        }

        if (!this.isSafePath(podcastDir, fileName)) {
            throw new Error('Invalid file path');
        }

        const dirPath = path.join(this.audioDir, podcastDir);
        const filePath = path.join(dirPath, fileName);

        // 确保目录存在
        await fs.ensureDir(dirPath);

        // 检查文件是否已存在
        if (await fs.pathExists(filePath)) {
            throw new Error(`File already exists: ${fileName}`);
        }

        // 保存文件
        await fs.writeFile(filePath, fileBuffer);
    }

    /**
     * 获取文件路径
     */
    getFilePath(podcastDir: string, fileName: string): string {
        if (!this.isSafePath(podcastDir, fileName)) {
            throw new Error('Invalid file path');
        }
        return path.join(this.audioDir, podcastDir, fileName);
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(podcastDir: string, fileName: string): Promise<boolean> {
        if (!this.isSafePath(podcastDir, fileName)) {
            return false;
        }
        const filePath = path.join(this.audioDir, podcastDir, fileName);
        return await fs.pathExists(filePath);
    }

    /**
     * 创建新的播客文件夹
     */
    async createPodcast(podcastDir: string, initialConfig?: any): Promise<void> {
        // 验证文件夹名称（防止特殊字符和路径穿越）
        if (!podcastDir || podcastDir.includes('..') || podcastDir.includes('/') || podcastDir.includes('\\')) {
            throw new Error('Invalid podcast directory name');
        }

        const dirPath = path.join(this.audioDir, podcastDir);

        // 检查目录是否已存在
        if (await fs.pathExists(dirPath)) {
            throw new Error(`Podcast directory already exists: ${podcastDir}`);
        }

        // 创建目录
        await fs.ensureDir(dirPath);

        // 如果提供了初始配置，创建 podcast.json
        if (initialConfig) {
            const configPath = path.join(dirPath, 'podcast.json');
            await fs.writeJson(configPath, initialConfig, { spaces: 2 });
        }
    }

    /**
     * 检查播客目录是否存在
     */
    async podcastExists(podcastDir: string): Promise<boolean> {
        const dirPath = path.join(this.audioDir, podcastDir);
        return await fs.pathExists(dirPath);
    }

    /**
     * 删除整个播客目录
     */
    async deletePodcast(podcastDir: string): Promise<void> {
        // 验证文件夹名称（防止特殊字符和路径穿越）
        if (!podcastDir || podcastDir.includes('..') || podcastDir.includes('/') || podcastDir.includes('\\')) {
            throw new Error('Invalid podcast directory name');
        }

        const dirPath = path.join(this.audioDir, podcastDir);

        // 检查目录是否存在
        if (!await fs.pathExists(dirPath)) {
            throw new Error(`Podcast directory not found: ${podcastDir}`);
        }

        // 删除整个目录及其所有内容
        await fs.remove(dirPath);
    }
}
