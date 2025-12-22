import chokidar from 'chokidar';
import path from 'path';
import { PodcastServer } from '../server';

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
    // 创建一个防抖的缓存清除函数
    const debouncedClearCache = debounce((filePath: string) => {
        const fileName = path.basename(filePath);
        const isConfigFile = fileName === 'podcast.json' || fileName === 'episodes.json';

        if (isConfigFile) {
            console.log(`检测到配置文件变化: ${fileName}，清除相关缓存...`);
        } else {
            console.log('检测到文件变化');
        }

        // RSS Feed 会在下次访问时从数据库重新生成，无需主动清除缓存
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

    // 监听所有可能的文件变化事件
    watcher
        .on('add', (filePath) => {
            console.log(`[WATCH] 文件被添加: ${filePath}`);
            debouncedClearCache(filePath);
        })
        .on('change', (filePath) => {
            console.log(`[WATCH] 文件被修改: ${filePath}`);
            debouncedClearCache(filePath);
        })
        .on('unlink', (filePath) => {
            console.log(`[WATCH] 文件被删除: ${filePath}`);
            debouncedClearCache(filePath);
        })
        .on('error', error => console.log(`[WATCH] 错误: ${error}`));

    console.log(`开始监听文件夹: ${server.audioDirectory}`);
}
