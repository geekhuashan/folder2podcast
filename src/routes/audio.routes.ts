/**
 * 音频文件访问路由
 *
 * 职责：
 * - 处理音频文件和封面图片的访问请求
 * - 统一路由格式：/audio/{userId}/{podcastName}/{fileName}
 * - S3 模式：重定向到 S3 公开 URL
 * - 本地模式：流式传输文件
 *
 * 注意：
 * - 不再需要"智能匹配"，URL直接包含完整路径
 * - 本地模式和S3模式使用完全相同的URL格式
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import { getStorage, LocalStorage } from '../services/storage';
import { db } from '../db';
import { podcasts } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * 根据文件扩展名获取 MIME type
 */
function getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
        // 音频格式
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/x-m4a',
        '.aac': 'audio/aac',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        // 图片格式
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 解析 Range 请求头
 */
function parseRangeHeader(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
    const matches = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!matches) {
        return null;
    }

    let start = matches[1] ? parseInt(matches[1], 10) : undefined;
    let end = matches[2] ? parseInt(matches[2], 10) : undefined;

    if (Number.isNaN(start as number)) {
        start = undefined;
    }
    if (Number.isNaN(end as number)) {
        end = undefined;
    }

    if (start === undefined && end === undefined) {
        return null;
    }

    if (start === undefined) {
        // 请求末尾的若干字节，例如 bytes=-500
        const suffixLength = end ?? 0;
        if (suffixLength <= 0) {
            return null;
        }
        start = Math.max(fileSize - suffixLength, 0);
        end = fileSize - 1;
    } else {
        if (start >= fileSize) {
            return null;
        }
        if (end === undefined || end >= fileSize) {
            end = fileSize - 1;
        }
    }

    if (start > (end as number)) {
        return null;
    }

    return { start, end: end as number };
}

/**
 * 注册音频文件访问路由
 */
export async function registerAudioRoutes(server: FastifyInstance): Promise<void> {
    const storage = getStorage();
    const storageType = storage.getStorageType();

    /**
     * GET /audio/:userId/:podcastName/:fileName
     * 访问音频文件（统一格式）
     *
     * 路径解析逻辑：
     * 1. URL 直接包含 userId，无需智能匹配
     * 2. 验证播客是否存在
     * 3. S3 模式：重定向到 S3 公开 URL
     * 4. 本地模式：流式传输文件
     */
    server.get<{
        Params: {
            userId: string;
            podcastName: string;
            fileName: string;
        };
    }>(
        '/audio/:userId/:podcastName/:fileName',
        async (request: FastifyRequest<{ Params: { userId: string; podcastName: string; fileName: string } }>, reply: FastifyReply) => {
            const { userId, podcastName, fileName } = request.params;

            try {
                // 1. 验证播客是否存在
                const podcast = await db
                    .select()
                    .from(podcasts)
                    .where(eq(podcasts.id, `${userId}:${podcastName}`))
                    .get();

                if (!podcast) {
                    return reply.code(404).send({
                        message: `Podcast not found: ${podcastName}`,
                        error: 'Not Found',
                        statusCode: 404
                    });
                }

                // 2. 构建文件路径
                const relativePath = `audio/${userId}/${podcastName}/${fileName}`;

                // 3. 检查文件是否存在
                if (!(await storage.fileExists(relativePath))) {
                    return reply.code(404).send({
                        message: `File not found: ${podcastName}/${fileName}`,
                        error: 'Not Found',
                        statusCode: 404
                    });
                }

                // 4. S3 模式：重定向到 S3 公开 URL
                if (storageType === 's3') {
                    const publicUrl = storage.getFileUrl(relativePath);
                    return reply.redirect(302, publicUrl);
                }

                // 5. 本地模式：支持 Range 的流式传输
                if (!(storage instanceof LocalStorage)) {
                    throw new Error('Local storage instance mismatch');
                }

                const fileSize = await storage.getFileSize(relativePath);
                const rangeHeader = request.headers.range;

                if (rangeHeader) {
                    const range = parseRangeHeader(rangeHeader, fileSize);

                    if (!range) {
                        return reply
                            .code(416)
                            .header('Content-Range', `bytes */${fileSize}`)
                            .send();
                    }

                    const chunkSize = range.end - range.start + 1;
                    const stream = storage.createReadStream(relativePath, {
                        start: range.start,
                        end: range.end
                    });

                    reply
                        .code(206)
                        .header('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`)
                        .header('Accept-Ranges', 'bytes')
                        .header('Content-Length', chunkSize)
                        .header('Content-Type', getMimeType(fileName));

                    return reply.send(stream);
                }

                const stream = storage.createReadStream(relativePath);

                reply
                    .header('Content-Type', getMimeType(fileName))
                    .header('Content-Length', fileSize)
                    .header('Accept-Ranges', 'bytes');

                return reply.send(stream);

            } catch (error: any) {
                server.log.error({
                    action: 'audio_file_error',
                    error: error.message,
                    stack: error.stack
                }, '音频文件访问失败');

                return reply.code(500).send({
                    message: 'Internal server error',
                    error: error.message,
                    statusCode: 500
                });
            }
        }
    );
}
