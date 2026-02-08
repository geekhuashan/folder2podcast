import { Feed } from 'feed';
import path from 'path';
import fs from 'fs-extra';
import { PodcastSource, ProcessOptions } from '../types';
import { getEnvConfig } from './env';

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i += 1;
    }
    const fixed = i === 0 ? 0 : n >= 10 ? 1 : 2;
    return `${n.toFixed(fixed)} ${units[i]}`;
}

function formatDate(date: Date): string {
    // Keep it ISO-ish but readable.
    try {
        return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
    } catch {
        return String(date);
    }
}

async function findSidecarAttachments(params: {
    dirPath: string;
    audioFileName: string;
    baseUrl: string;
    dirName: string;
}): Promise<Array<{ fileName: string; url: string }>> {
    const { dirPath, audioFileName, baseUrl, dirName } = params;
    const stem = audioFileName.replace(/\.[^/.]+$/, '');

    // Common "sidecar" files stored next to audio (notes, slides, PDFs, cover, etc).
    const exts = ['pdf', 'epub', 'mobi', 'azw3', 'txt', 'md', 'jpg', 'jpeg', 'png', 'webp'];
    const results: Array<{ fileName: string; url: string }> = [];

    for (const ext of exts) {
        const candidate = `${stem}.${ext}`;
        const fullPath = path.join(dirPath, candidate);
        if (await fs.pathExists(fullPath)) {
            const url = `${baseUrl}/audio/${encodeURIComponent(dirName)}/${encodeURIComponent(candidate)}`;
            results.push({ fileName: candidate, url });
        }
    }

    return results;
}

async function getFileSize(filePath: string): Promise<number> {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch (error) {
        console.warn(`Failed to get file size for ${filePath}:`, error);
        return 0;
    }
}

// 获取feed文件的存储路径
export function getFeedStoragePath(source: PodcastSource): string {
    const feedStorageDir = path.join(process.cwd(), '.feeds');
    // 使用文件夹名作为feed文件名，确保唯一性
    return path.join(feedStorageDir, `${source.dirName}.xml`);
}

// 获取feed的URL
function getFeedUrl(baseUrl: string, source: PodcastSource): string {
    return `${baseUrl}/feeds/${encodeURIComponent(source.dirName)}.xml`;
}

async function buildEpisodeShownotes(params: {
    source: PodcastSource;
    episode: { title: string; fileName: string; pubDate: Date };
    episodeUrl: string;
    fileSizeBytes: number;
    baseUrl: string;
    defaultMode: 'title' | 'full';
}): Promise<{ plain: string; html: string }> {
    const { source, episode, episodeUrl, fileSizeBytes, baseUrl, defaultMode } = params;
    const { config, dirName, dirPath } = source;

    if (defaultMode === 'title') {
        return { plain: episode.title, html: `<p>${escapeHtml(episode.title)}</p>` };
    }

    const attachments = await findSidecarAttachments({
        dirPath,
        audioFileName: episode.fileName,
        baseUrl,
        dirName
    });

    const lines: string[] = [];
    lines.push(episode.title);
    lines.push(`Podcast: ${config.title}`);
    lines.push(`Published: ${formatDate(episode.pubDate)}`);
    lines.push(`File: ${episode.fileName}`);
    lines.push(`Size: ${formatBytes(fileSizeBytes)}`);
    lines.push(`Audio: ${episodeUrl}`);
    if (attachments.length) {
        lines.push(`Attachments: ${attachments.map(a => a.fileName).join(', ')}`);
    }

    const htmlParts: string[] = [];
    htmlParts.push(`<p><strong>${escapeHtml(episode.title)}</strong></p>`);
    htmlParts.push('<ul>');
    htmlParts.push(`<li><strong>Podcast</strong>: ${escapeHtml(config.title)}</li>`);
    htmlParts.push(`<li><strong>Published</strong>: ${escapeHtml(formatDate(episode.pubDate))}</li>`);
    htmlParts.push(`<li><strong>File</strong>: ${escapeHtml(episode.fileName)}</li>`);
    htmlParts.push(`<li><strong>Size</strong>: ${escapeHtml(formatBytes(fileSizeBytes))}</li>`);
    htmlParts.push(`<li><strong>Audio</strong>: <a href="${escapeHtml(episodeUrl)}">${escapeHtml(episodeUrl)}</a></li>`);
    if (attachments.length) {
        htmlParts.push('<li><strong>Attachments</strong>:<ul>');
        for (const a of attachments) {
            htmlParts.push(`<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.fileName)}</a></li>`);
        }
        htmlParts.push('</ul></li>');
    }
    htmlParts.push('</ul>');

    return { plain: lines.join('\n'), html: htmlParts.join('') };
}

export async function generateFeed(source: PodcastSource, options: ProcessOptions): Promise<string> {
    const { config, episodes, coverPath } = source;
    const { baseUrl, defaultCover } = options;
    const env = getEnvConfig();
    const shownotesMode = env.EPISODE_SHOWNOTES || 'full';

    // 使用封面图片或默认封面
    const feedImage = coverPath
        ? `${baseUrl}/audio/${encodeURIComponent(path.basename(source.dirPath))}/cover.jpg`
        : defaultCover;

    // 获取最新一集的日期作为Feed更新时间
    const latestEpisode = episodes[episodes.length - 1];
    const updateDate = latestEpisode ? latestEpisode.pubDate : new Date();

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
        feed: getFeedUrl(baseUrl, source),
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
        const fileSize = await getFileSize(episode.filePath);
        const shownotes = await buildEpisodeShownotes({
            source,
            episode,
            episodeUrl,
            fileSizeBytes: fileSize,
            baseUrl,
            defaultMode: shownotesMode
        });

        feed.addItem({
            title: episode.title,
            id: episodeUrl,
            link: episodeUrl,
            // Many clients show "description" as a short preview; keep it readable.
            description: shownotesMode === 'title' ? episode.title : `${episode.title} (${formatBytes(fileSize)})`,
            // Prefer rich HTML show notes in <content:encoded>.
            content: shownotes.html || `<p>${escapeHtml(episode.title)}</p>`,
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
                type: getMediaType(episode.fileName),
                length: fileSize
            },
            extensions: [
                {
                    name: '_iTunes',
                    objects: {
                        'itunes:author': config.author,
                        'itunes:subtitle': episode.title,
                        // Keep iTunes summary plain text (some clients don't like HTML here).
                        'itunes:summary': shownotes.plain || episode.title,
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

function getMediaType(fileName: string): string {
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
