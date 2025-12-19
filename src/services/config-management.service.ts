import fs from 'fs-extra';
import path from 'path';
import { getEnvConfig } from '../utils/env';
import { PodcastConfigV2, PodcastMetadata, PodcastParsingOptions } from '../types';

/**
 * 配置管理服务
 * 提供播客配置的读取和更新功能
 */
export class ConfigManagementService {
    private audioDir: string;

    constructor() {
        const config = getEnvConfig();
        this.audioDir = path.resolve(config.AUDIO_DIR);
    }

    /**
     * 检查路径是否安全(防止路径穿越攻击)
     */
    private isSafePath(podcastDir: string): boolean {
        const fullPath = path.resolve(this.audioDir, podcastDir);
        return fullPath.startsWith(this.audioDir);
    }

    /**
     * 获取配置文件路径
     */
    private getConfigPath(podcastDir: string): string {
        return path.join(this.audioDir, podcastDir, 'podcast.json');
    }

    /**
     * 读取播客配置
     */
    async getConfig(podcastDir: string): Promise<PodcastConfigV2 | null> {
        if (!this.isSafePath(podcastDir)) {
            throw new Error('Invalid podcast directory');
        }

        const configPath = this.getConfigPath(podcastDir);

        if (!await fs.pathExists(configPath)) {
            return null;
        }

        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content);
            return config as PodcastConfigV2;
        } catch (error) {
            throw new Error(`Failed to read config: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * 更新播客配置(完整替换)
     */
    async updateConfig(podcastDir: string, config: PodcastConfigV2): Promise<void> {
        if (!this.isSafePath(podcastDir)) {
            throw new Error('Invalid podcast directory');
        }

        // 验证配置格式
        this.validateConfig(config);

        const dirPath = path.join(this.audioDir, podcastDir);
        const configPath = this.getConfigPath(podcastDir);

        // 确保目录存在
        await fs.ensureDir(dirPath);

        // 写入配置文件
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    /**
     * 更新播客元数据(部分更新)
     */
    async updateMetadata(podcastDir: string, metadata: Partial<PodcastMetadata>): Promise<void> {
        const config = await this.getConfig(podcastDir) || { metadata: {}, parsing: {} };

        // 合并元数据
        config.metadata = {
            ...config.metadata,
            ...metadata
        };

        await this.updateConfig(podcastDir, config);
    }

    /**
     * 更新解析选项(部分更新)
     */
    async updateParsingOptions(podcastDir: string, parsing: Partial<PodcastParsingOptions>): Promise<void> {
        const config = await this.getConfig(podcastDir) || { metadata: {}, parsing: {} };

        // 合并解析选项
        config.parsing = {
            ...config.parsing,
            ...parsing
        };

        await this.updateConfig(podcastDir, config);
    }

    /**
     * 删除配置文件
     */
    async deleteConfig(podcastDir: string): Promise<void> {
        if (!this.isSafePath(podcastDir)) {
            throw new Error('Invalid podcast directory');
        }

        const configPath = this.getConfigPath(podcastDir);

        if (await fs.pathExists(configPath)) {
            await fs.remove(configPath);
        }
    }

    /**
     * 验证配置格式
     */
    private validateConfig(config: PodcastConfigV2): void {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid config format');
        }

        // 验证 metadata (如果存在)
        if (config.metadata) {
            const { metadata } = config;

            if (metadata.explicit !== undefined && typeof metadata.explicit !== 'boolean') {
                throw new Error('explicit must be a boolean');
            }

            if (metadata.email !== undefined && typeof metadata.email !== 'string') {
                throw new Error('email must be a string');
            }
        }

        // 验证 parsing (如果存在)
        if (config.parsing) {
            const { parsing } = config;

            if (parsing.useMTime !== undefined && typeof parsing.useMTime !== 'boolean') {
                throw new Error('useMTime must be a boolean');
            }
        }
    }

    /**
     * 检查配置文件是否存在
     */
    async configExists(podcastDir: string): Promise<boolean> {
        if (!this.isSafePath(podcastDir)) {
            return false;
        }
        const configPath = this.getConfigPath(podcastDir);
        return await fs.pathExists(configPath);
    }
}
