import { IDownloadAdapter, DownloadPlatform } from './base/download-adapter.interface';
import { BilibiliAdapter } from './bilibili/bilibili.adapter';

/**
 * 下载适配器工厂
 *
 * 职责：
 * - 管理所有下载适配器的单例实例
 * - 根据 URL 自动识别平台
 * - 提供统一的接口获取适配器
 */
export class DownloadAdapterFactory {
    private adapters: Map<DownloadPlatform, IDownloadAdapter>;

    constructor() {
        this.adapters = new Map();
        this.initializeAdapters();
    }

    /**
     * 初始化所有可用的适配器
     */
    private initializeAdapters(): void {
        // 注册 Bilibili 适配器
        this.adapters.set(DownloadPlatform.BILIBILI, new BilibiliAdapter());

        // TODO: 后续添加其他平台适配器
        // this.adapters.set(DownloadPlatform.DOUYIN, new DouyinAdapter());
        // this.adapters.set(DownloadPlatform.YOUTUBE, new YoutubeAdapter());
        // this.adapters.set(DownloadPlatform.XIGUA, new XiguaAdapter());

        console.log(`[DownloadAdapterFactory] 已注册 ${this.adapters.size} 个下载适配器`);
    }

    /**
     * 根据平台标识获取适配器
     *
     * @param platform - 平台枚举
     * @returns 下载适配器实例
     * @throws Error - 如果平台不支持
     */
    getAdapter(platform: DownloadPlatform): IDownloadAdapter {
        const adapter = this.adapters.get(platform);

        if (!adapter) {
            throw new Error(`不支持的平台: ${platform}`);
        }

        return adapter;
    }

    /**
     * 根据 URL 自动识别平台并返回对应的适配器
     *
     * @param url - 视频 URL
     * @returns 下载适配器实例
     * @throws Error - 如果无法识别平台或平台不支持
     */
    getAdapterByUrl(url: string): IDownloadAdapter {
        // 遍历所有适配器，找到能处理这个 URL 的适配器
        for (const adapter of this.adapters.values()) {
            if (adapter.isValidUrl(url)) {
                return adapter;
            }
        }

        throw new Error(`无法识别 URL 对应的平台: ${url}`);
    }

    /**
     * 获取所有可用的平台列表
     *
     * @returns 平台枚举数组
     */
    getAvailablePlatforms(): DownloadPlatform[] {
        return Array.from(this.adapters.keys());
    }

    /**
     * 检查指定平台的适配器是否可用
     *
     * @param platform - 平台枚举
     * @returns Promise<是否可用>
     */
    async checkPlatformAvailability(platform: DownloadPlatform): Promise<boolean> {
        const adapter = this.adapters.get(platform);

        if (!adapter) {
            return false;
        }

        try {
            return await adapter.checkAvailability();
        } catch (error) {
            console.warn(`[DownloadAdapterFactory] 检查平台 ${platform} 可用性失败:`, error);
            return false;
        }
    }

    /**
     * 检查所有平台的可用性
     *
     * @returns Promise<平台可用性映射>
     */
    async checkAllPlatformsAvailability(): Promise<Map<DownloadPlatform, boolean>> {
        const results = new Map<DownloadPlatform, boolean>();

        for (const platform of this.adapters.keys()) {
            const isAvailable = await this.checkPlatformAvailability(platform);
            results.set(platform, isAvailable);
        }

        return results;
    }
}

/**
 * 创建全局单例工厂实例
 */
let factoryInstance: DownloadAdapterFactory | null = null;

/**
 * 获取下载适配器工厂的单例实例
 *
 * @returns DownloadAdapterFactory 实例
 */
export function getDownloadAdapterFactory(): DownloadAdapterFactory {
    if (!factoryInstance) {
        factoryInstance = new DownloadAdapterFactory();
    }

    return factoryInstance;
}
