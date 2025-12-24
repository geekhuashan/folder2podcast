/**
 * 音频文件访问路由
 *
 * 职责：
 * - 处理音频文件的访问请求
 * - 支持用户隔离（audio/{userId}/{podcastName}/{fileName}）
 * - 兼容公开访问（RSS Feed）
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs-extra';
import { getEnvConfig } from '../utils/env';
import { getCurrentUser } from '../utils/auth';

/**
 * 注册音频文件访问路由
 */
export async function registerAudioRoutes(server: FastifyInstance): Promise<void> {
    const AUDIO_DIR = getEnvConfig().AUDIO_DIR;

    /**
     * GET /audio/:podcastName/:fileName
     * 访问音频文件（支持用户隔离）
     *
     * 路径解析逻辑：
     * 1. 如果用户已登录，尝试访问 audio/{userId}/{podcastName}/{fileName}
     * 2. 如果未登录或文件不存在，尝试访问所有用户的播客目录
     * 3. 这样可以兼容 RSS Feed 的公开访问
     */
    server.get<{
        Params: {
            podcastName: string;
            fileName: string;
        };
    }>(
        '/audio/:podcastName/:fileName',
        async (request: FastifyRequest<{ Params: { podcastName: string; fileName: string } }>, reply: FastifyReply) => {
            const { podcastName, fileName } = request.params;

            try {
                // 1. 优先尝试当前登录用户的文件
                const user = getCurrentUser(request);
                if (user) {
                    const userFilePath = path.join(AUDIO_DIR, user.id, podcastName, fileName);
                    if (await fs.pathExists(userFilePath)) {
                        const fileStream = fs.createReadStream(userFilePath);
                        const stat = await fs.stat(userFilePath);

                        reply.header('Content-Type', 'audio/mpeg');
                        reply.header('Content-Length', stat.size);
                        reply.header('Accept-Ranges', 'bytes');

                        return reply.send(fileStream);
                    }
                }

                // 2. 如果用户文件不存在，尝试查找其他用户的文件（用于公开RSS Feed）
                const audioDir = path.resolve(AUDIO_DIR);
                const userDirs = await fs.readdir(audioDir);

                for (const userDir of userDirs) {
                    // 跳过隐藏文件和 .temp 目录
                    if (userDir.startsWith('.')) continue;

                    const candidatePath = path.join(audioDir, userDir, podcastName, fileName);
                    if (await fs.pathExists(candidatePath)) {
                        server.log.info({
                            action: 'audio_file_access',
                            podcastName,
                            fileName,
                            foundInUser: userDir
                        }, '找到音频文件');

                        const fileStream = fs.createReadStream(candidatePath);
                        const stat = await fs.stat(candidatePath);

                        reply.header('Content-Type', 'audio/mpeg');
                        reply.header('Content-Length', stat.size);
                        reply.header('Accept-Ranges', 'bytes');

                        return reply.send(fileStream);
                    }
                }

                // 3. 文件不存在
                return reply.code(404).send({
                    message: `Audio file not found: ${podcastName}/${fileName}`,
                    error: 'Not Found',
                    statusCode: 404
                });

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
