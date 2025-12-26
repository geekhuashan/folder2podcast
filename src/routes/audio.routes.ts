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
import { getStorage } from '../services/storage';
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

                // 5. 本地模式：流式传输文件
                const fileBuffer = await storage.readFile(relativePath);
                const fileSize = fileBuffer.length;

                reply.header('Content-Type', getMimeType(fileName));
                reply.header('Content-Length', fileSize);
                reply.header('Accept-Ranges', 'bytes');

                return reply.send(fileBuffer);

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
