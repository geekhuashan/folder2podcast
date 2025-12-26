import chokidar from 'chokidar';
import path from 'path';
import { PodcastServer } from '../server';
import { getStorage } from '../services/storage';

function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | undefined;

    return function (this: void, ...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            fn.apply(this, args);
            timeoutId = undefined;
        }, delay);
    };
}

/**
 * 从文件路径提取播客目录名
 * @param filePath 文件路径
 * @param audioDir 音频根目录
 * @returns 播客目录名,如果无法提取返回 undefined
 */
function extractPodcastDirName(filePath: string, audioDir: string): string | undefined {
    const relativePath = path.relative(audioDir, filePath);
    const parts = relativePath.split(path.sep);

    // 第一个部分应该是播客目录名
    if (parts.length > 0 && parts[0]) {
        return parts[0];
    }

    return undefined;
}

export function watchFolderChanges(server: PodcastServer): void {
    // 检查存储模式
    const storage = getStorage();
    const storageType = storage.getStorageType();

    // S3 模式下禁用文件监听（无文件系统）
    if (storageType === 's3') {
        console.log('[文件监听] S3 存储模式已启用，文件监听器已禁用');
        console.log('[文件监听] 提示：S3 模式下，文件变化不会被自动检测。请手动触发播客扫描。');
        return;
    }

    // 本地模式下启用文件监听（用于处理直接操作文件系统的情况）
    console.log('[文件监听] 本地存储模式已启用，启动文件监听器...');
    console.log('[文件监听] 提示：文件操作已通过 Web API 实时更新数据库，Watcher 仅用于记录日志。');

    // 创建一个防抖的日志函数
    const debouncedLog = debounce((filePath: string, action: string) => {
        const fileName = path.basename(filePath);
        const isConfigFile = fileName === 'podcast.json' || fileName === 'episodes.json';

        if (isConfigFile) {
            console.log(`[文件监听] 检测到配置文件${action}: ${fileName}`);
        } else {
            console.log(`[文件监听] 检测到文件${action}: ${fileName}`);
        }
    }, 1000);

    // 初始化 watcher
    const watcher = chokidar.watch(server.audioDirectory, {
        // 忽略隐藏文件
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        ignorePermissionErrors: true,
        // 添加详细的调试信息
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    // 监听所有可能的文件变化事件（仅记录日志）
    watcher
        .on('add', (filePath) => {
            console.log(`[WATCH] 文件被添加: ${filePath}`);
            debouncedLog(filePath, '添加');
        })
        .on('change', (filePath) => {
            console.log(`[WATCH] 文件被修改: ${filePath}`);
            debouncedLog(filePath, '修改');
        })
        .on('unlink', (filePath) => {
            console.log(`[WATCH] 文件被删除: ${filePath}`);
            debouncedLog(filePath, '删除');
        })
        .on('error', error => console.log(`[WATCH] 错误: ${error}`));

    console.log(`[文件监听] 开始监听文件夹: ${server.audioDirectory}`);
}
