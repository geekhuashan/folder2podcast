import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// 加载环境变量的优先级:
// 1. .env.local (本地覆盖，不提交到 Git)
// 2. .env (通用配置，不提交到 Git)
// 3. .env.development 或 .env.production (根据 NODE_ENV，提交到 Git)
// 4. process.env (系统环境变量，优先级最高)

const nodeEnv = process.env.NODE_ENV || 'development';
const rootDir = path.resolve(__dirname, '../..');

// 按优先级加载配置文件
const envFiles = [
    path.join(rootDir, `.env.${nodeEnv}`),
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
];

// 从低优先级到高优先级加载，后加载的会覆盖先加载的
envFiles.forEach(file => {
    if (fs.existsSync(file)) {
        dotenv.config({ path: file, override: false });
    }
});

export interface EnvConfig {
    // 音频文件夹路径
    AUDIO_DIR: string;
    // 服务器端口
    PORT: number;
    // 全局标题显示策略：clean=清理后的标题，full=完整文件名
    TITLE_FORMAT: 'clean' | 'full';
    // 服务器基础URL，用于生成RSS feed中的链接（不配置时自动生成）
    BASE_URL: string;
    // 主机名/IP地址（用于生成BASE_URL，默认localhost）
    HOST: string;
    // 管理 API 密钥（可选）
    API_KEY?: string;
}

/**
 * 获取环境变量配置
 * 如果环境变量未设置，使用默认值
 */
export function getEnvConfig(): EnvConfig {
    const defaultAudioDir = path.join(process.cwd(), 'audio');
    const defaultPort = 3100;
    const defaultHost = 'localhost';

    const port = parseInt(process.env.PORT || String(defaultPort), 10);
    const host = process.env.HOST || defaultHost;

    // BASE_URL 优先使用环境变量，否则根据 HOST 和 PORT 自动生成
    const baseUrl = process.env.BASE_URL || `http://${host}:${port}`;

    return {
        // 音频文件夹路径，默认为当前目录下的 audio 文件夹
        AUDIO_DIR: process.env.AUDIO_DIR || defaultAudioDir,
        // 服务器端口，默认3100
        PORT: port,
        // 标题显示策略，默认为full（完整文件名，不含扩展名）
        TITLE_FORMAT: (process.env.TITLE_FORMAT as 'clean' | 'full') || 'full',
        // 主机名/IP地址
        HOST: host,
        // 服务器基础URL
        BASE_URL: baseUrl,
        // API 密钥（可选）
        API_KEY: process.env.API_KEY
    };
}
