import {
    IDownloadAdapter,
    DownloadPlatform,
    VideoInfo,
    DownloadOptions,
    DownloadResult
} from './download-adapter.interface';

/**
 * 下载适配器基类
 *
 * 提供通用实现和模板方法
 */
export abstract class BaseDownloadAdapter implements IDownloadAdapter {
    /**
     * 平台标识（子类必须实现）
     */
    abstract readonly platform: DownloadPlatform;

    /**
     * 验证URL（抽象方法，子类实现）
     */
    abstract isValidUrl(url: string): boolean;

    /**
     * 提取视频ID（抽象方法，子类实现）
     */
    abstract extractVideoId(url: string): string | null;

    /**
     * 下载音频并返回完整信息（抽象方法，子类实现）
     */
    abstract download(options: DownloadOptions): Promise<DownloadResult>;

    /**
     * 检查下载工具是否可用（抽象方法，子类实现）
     */
    abstract checkAvailability(): Promise<boolean>;

    /**
     * 通用方法：规范化URL
     */
    protected normalizeUrl(url: string): string {
        return url.trim();
    }

    /**
     * 通用方法：生成安全的文件名
     * 移除非法字符，确保文件名在所有操作系统上有效
     */
    protected sanitizeFileName(fileName: string): string {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '')  // 移除Windows非法字符
            .replace(/\s+/g, ' ')           // 合并多个空格
            .trim()
            .substring(0, 200);             // 限制长度，避免路径过长
    }

    /**
     * 通用方法：记录日志
     */
    protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${this.platform.toUpperCase()}] [${timestamp}]`;

        switch (level) {
            case 'info':
                console.log(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
        }
    }
}
