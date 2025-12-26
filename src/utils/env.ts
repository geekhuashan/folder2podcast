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

    // ========== S3 存储配置 ==========
    // 存储模式：local=本地存储，s3=S3对象存储
    STORAGE_MODE: 'local' | 's3';
    // S3 端点地址（如七牛云：https://s3-cn-east-1.qiniucs.com）
    S3_ENDPOINT?: string;
    // S3 区域（默认 us-east-1）
    S3_REGION?: string;
    // S3 Bucket 名称
    S3_BUCKET?: string;
    // S3 访问密钥 ID
    S3_ACCESS_KEY_ID?: string;
    // S3 访问密钥
    S3_SECRET_ACCESS_KEY?: string;
    // S3 公开访问 URL（用于生成文件链接）
    S3_PUBLIC_URL?: string;
    // S3 Bucket 内路径前缀（可选，如 folder2podcast）
    S3_BUCKET_PREFIX?: string;
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

    // 存储模式，默认为 local
    const storageMode = (process.env.STORAGE_MODE as 'local' | 's3') || 'local';

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
        API_KEY: process.env.API_KEY,

        // ========== S3 存储配置 ==========
        STORAGE_MODE: storageMode,
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_REGION: process.env.S3_REGION,
        S3_BUCKET: process.env.S3_BUCKET,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
        S3_BUCKET_PREFIX: process.env.S3_BUCKET_PREFIX,
    };
}
