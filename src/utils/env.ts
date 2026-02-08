import path from 'path';

export interface EnvConfig {
    // 音频文件夹路径
    AUDIO_DIR: string;
    // 服务器端口
    PORT: number;
    // 全局标题显示策略：clean=清理后的标题，full=完整文件名
    TITLE_FORMAT: 'clean' | 'full';
    // 服务器基础URL，用于生成RSS feed中的链接
    BASE_URL: string;
    // Episode shownotes verbosity
    // title: only episode title
    // full: include file info + links + attachments (pdf/etc) when available
    EPISODE_SHOWNOTES: 'title' | 'full';
    // Inline attachments in show notes HTML (content:encoded).
    // none: link only
    // images: inline images only
    // all: inline images + text (md/txt)
    EPISODE_INLINE_ATTACHMENTS: 'none' | 'images' | 'all';
    // Max chars to inline from a .md/.txt attachment (rest is linked).
    EPISODE_INLINE_TEXT_MAX_CHARS: number;

    // Remote cover fetching (best-effort). Cached under process.cwd()/.covers
    REMOTE_COVER_ENABLED: boolean;
    REMOTE_COVER_PROVIDER: 'none' | 'itunes';
    REMOTE_COVER_COUNTRY: string;
    REMOTE_COVER_TTL_DAYS: number;
    REMOTE_COVER_TIMEOUT_MS: number;
}

/**
 * 获取环境变量配置
 * 如果环境变量未设置，使用默认值
 */
export function getEnvConfig(): EnvConfig {
    const defaultAudioDir = path.join(process.cwd(), 'audio');
    const defaultPort = 3000;

    const port = parseInt(process.env.PORT || String(defaultPort), 10);
    // 构建默认的基础URL
    const defaultBaseUrl = `http://localhost:${port}`;

    return {
        // 音频文件夹路径，默认为当前目录下的 audio 文件夹
        AUDIO_DIR: process.env.AUDIO_DIR || defaultAudioDir,
        // 服务器端口，默认3000
        PORT: port,
        // 标题显示策略，默认为full（完整文件名，不含扩展名）
        TITLE_FORMAT: (process.env.TITLE_FORMAT as 'clean' | 'full') || 'full',
        // 服务器基础URL，默认为 http://localhost:端口号
        BASE_URL: process.env.BASE_URL || defaultBaseUrl,
        // Shownotes verbosity. Default to full to include richer info.
        EPISODE_SHOWNOTES: (process.env.EPISODE_SHOWNOTES as 'title' | 'full') || 'full',
        EPISODE_INLINE_ATTACHMENTS: (process.env.EPISODE_INLINE_ATTACHMENTS as 'none' | 'images' | 'all') || 'all',
        EPISODE_INLINE_TEXT_MAX_CHARS: parseInt(process.env.EPISODE_INLINE_TEXT_MAX_CHARS || '8000', 10),

        REMOTE_COVER_ENABLED: (process.env.REMOTE_COVER_ENABLED || 'true').toLowerCase() === 'true',
        REMOTE_COVER_PROVIDER: (process.env.REMOTE_COVER_PROVIDER as 'none' | 'itunes') || 'itunes',
        REMOTE_COVER_COUNTRY: process.env.REMOTE_COVER_COUNTRY || 'cn',
        REMOTE_COVER_TTL_DAYS: parseInt(process.env.REMOTE_COVER_TTL_DAYS || '30', 10),
        REMOTE_COVER_TIMEOUT_MS: parseInt(process.env.REMOTE_COVER_TIMEOUT_MS || '8000', 10)
    };
}
