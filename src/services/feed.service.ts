import { Feed } from 'feed';
import path from 'path';
import fs from 'fs-extra';
import { PodcastSourceV2, ProcessOptions } from '../types';

interface CacheEntry {
    xml: string;
    timestamp: number;
}

export class FeedService {
    // 缓存 TTL: 5 分钟
    private readonly CACHE_TTL = 5 * 60 * 1000;

    // 内存缓存 Map
    private cache: Map<string, CacheEntry> = new Map();

    /**
     * 生成 RSS Feed (带缓存)
     * @param source 播客源数据
     * @param options 处理选项
     * @returns RSS XML 字符串
     */
    async generateFeed(source: PodcastSourceV2, options: ProcessOptions): Promise<string> {
        const cacheKey = source.dirName;

        // 检查缓存
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
            console.log(`Cache hit for feed: ${cacheKey}`);
            return cached.xml;
        }

        // 缓存未命中或过期,生成新的 feed
        console.log(`Generating feed for: ${cacheKey}`);
        const xml = await this.buildRSS(source, options);

        // 更新缓存
        this.cache.set(cacheKey, {
            xml,
            timestamp: Date.now()
        });

        return xml;
    }

    /**
     * 清除缓存
     * @param dirName 播客目录名,如果不提供则清除所有缓存
     */
    clearCache(dirName?: string): void {
        if (dirName) {
            this.cache.delete(dirName);
            console.log(`Cleared cache for: ${dirName}`);
        } else {
            this.cache.clear();
            console.log('Cleared all cache');
        }
    }

    /**
     * 检查缓存是否有效
     * @param timestamp 缓存时间戳
     * @returns 是否有效
     */
    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.CACHE_TTL;
    }

    /**
     * 构建 RSS feed
     * @param source 播客源数据
     * @param options 处理选项
     * @returns RSS XML 字符串
     */
    private async buildRSS(source: PodcastSourceV2, options: ProcessOptions): Promise<string> {
        const { config, episodes, coverPath } = source;
        const { baseUrl, defaultCover } = options;

        // 使用封面图片或默认封面
        const feedImage = coverPath
            ? `${baseUrl}/audio/${encodeURIComponent(path.basename(source.dirPath))}/cover.jpg`
            : defaultCover;

        // 获取最新一集的日期作为Feed更新时间
        const latestEpisode = episodes[episodes.length - 1];
        const updateDate = latestEpisode ? latestEpisode.pubDate : new Date();

        // 获取 feed URL
        const feedUrl = `${baseUrl}/feeds/${encodeURIComponent(source.dirName)}.xml`;

        // 创建Feed实例
        const feed = new Feed({
            title: config.title,
            description: config.description,
            id: baseUrl,
            link: config.websiteUrl || baseUrl,
            language: config.language,
            copyright: `All rights reserved ${new Date().getFullYear()}, ${config.author}`,
            updated: updateDate,
            generator: 'Folder2Cast',
            feed: feedUrl,
            author: {
                name: config.author,
                email: config.email,
                link: config.websiteUrl || baseUrl
            },
            image: feedImage
        });

        // 添加命名空间和根级属性
        feed.addExtension({
            name: '_declaration',
            objects: {
                _attributes: {
                    version: '1.0',
                    encoding: 'utf-8'
                }
            }
        });

        feed.addExtension({
            name: '_namespace',
            objects: {
                'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
                'xmlns:atom': 'http://www.w3.org/2005/Atom'
            }
        });

        // 添加标准RSS image标签
        feed.addExtension({
            name: '_channel',
            objects: {
                'image': {
                    'url': feedImage,
                    'title': config.title,
                    'link': config.websiteUrl || baseUrl
                }
            }
        });

        // 添加iTunes特定标签
        feed.addExtension({
            name: '_iTunes',
            objects: {
                'itunes:image': {
                    _attr: { href: feedImage }
                },
                'itunes:category': {
                    _attr: { text: config.category }
                },
                'itunes:author': config.author,
                'itunes:summary': config.description,
                'itunes:explicit': config.explicit ? 'yes' : 'no',
                'itunes:owner': {
                    'itunes:name': config.author,
                    'itunes:email': config.email
                },
                'itunes:type': 'serial'
            }
        });

        // 添加每个剧集
        for (const episode of episodes) {
            const episodeUrl = `${baseUrl}/audio/${encodeURIComponent(source.dirName)}/${encodeURIComponent(episode.fileName)}`;
            const fileSize = await this.getFileSize(episode.filePath);

            feed.addItem({
                title: episode.title,
                id: episodeUrl,
                link: episodeUrl,
                description: episode.title,
                content: episode.title,
                date: episode.pubDate,
                author: [
                    {
                        name: config.author,
                        email: config.email,
                        link: config.websiteUrl || baseUrl
                    }
                ],
                enclosure: {
                    url: episodeUrl,
                    type: this.getMediaType(episode.fileName),
                    length: fileSize
                },
                extensions: [
                    {
                        name: '_iTunes',
                        objects: {
                            'itunes:author': config.author,
                            'itunes:subtitle': episode.title,
                            'itunes:summary': episode.title,
                            'itunes:duration': '00:00:00',
                            'itunes:explicit': config.explicit ? 'yes' : 'no',
                            'itunes:episodeType': 'full'
                        }
                    }
                ]
            });
        }

        // 生成RSS XML
        return feed.rss2();
    }

    /**
     * 获取文件大小
     * @param filePath 文件路径
     * @returns 文件大小(字节)
     */
    private async getFileSize(filePath: string): Promise<number> {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            console.warn(`Failed to get file size for ${filePath}:`, error);
            return 0;
        }
    }

    /**
     * 根据文件名获取 MIME 类型
     * @param fileName 文件名
     * @returns MIME 类型
     */
    private getMediaType(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case '.mp3':
                return 'audio/mpeg';
            case '.m4a':
                return 'audio/x-m4a';
            case '.wav':
                return 'audio/wav';
            default:
                return 'audio/mpeg';
        }
    }
}
