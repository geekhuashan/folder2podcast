import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BilibiliDownloadService } from '../services/bilibili-download.service';
import { FeedService } from '../services/feed.service';
import { BilibiliDownloadRequest } from '../types';

/**
 * 注册 B 站视频下载相关路由
 *
 * 路由列表:
 * - POST /api/bilibili/download - 下载 B 站视频为音频
 *
 * @param server - Fastify 实例
 * @param bilibiliService - B 站下载服务实例
 * @param feedService - Feed 服务实例（用于清除缓存）
 */
export async function registerBilibiliRoutes(
    server: FastifyInstance,
    bilibiliService: BilibiliDownloadService,
    feedService: FeedService
): Promise<void> {
    /**
     * POST /api/bilibili/download
     * 下载 B 站视频为音频并添加到播客
     *
     * 请求体:
     * {
     *   "url": "BV1qt4y1X7TW",              // 必需：B 站视频链接或 BV 号
     *   "podcastName": "我的播客",            // 可选：目标播客名称
     *   "episodeTitle": "第一集",            // 可选：自定义剧集标题
     *   "autoCreatePodcast": true           // 可选：是否自动创建播客（默认 true）
     * }
     *
     * 响应:
     * {
     *   "success": true,
     *   "data": {
     *     "filePath": "/podcasts/我的播客/第一集.m4a",
     *     "fileName": "第一集.m4a",
     *     "podcastName": "我的播客",
     *     "episodeTitle": "第一集",
     *     "videoInfo": {
     *       "bvid": "BV1qt4y1X7TW",
     *       "title": "原始视频标题"
     *     }
     *   }
     * }
     */
    server.post<{ Body: BilibiliDownloadRequest }>(
        '/api/bilibili/download',
        async (request: FastifyRequest<{ Body: BilibiliDownloadRequest }>, reply: FastifyReply) => {
            try {
                // 1. 提取请求参数
                const downloadRequest = request.body;

                // 2. 验证必需参数
                if (!downloadRequest.url) {
                    return reply.code(400).send({
                        success: false,
                        error: '缺少必需参数: url'
                    });
                }

                // 3. 记录请求日志
                server.log.info({
                    action: 'bilibili_download_start',
                    url: downloadRequest.url,
                    podcastName: downloadRequest.podcastName,
                    episodeTitle: downloadRequest.episodeTitle
                }, '开始下载 B 站视频');

                // 4. 调用下载服务
                const result = await bilibiliService.downloadAudio(downloadRequest);

                // 5. 清除对应播客的 Feed 缓存
                // 这样下次访问 RSS feed 时会自动包含新下载的音频
                feedService.clearCache(result.podcastName);

                server.log.info({
                    action: 'bilibili_download_success',
                    fileName: result.fileName,
                    podcastName: result.podcastName
                }, '下载完成并清除缓存');

                // 6. 返回成功响应
                return reply.code(200).send({
                    success: true,
                    data: result
                });

            } catch (error: any) {
                // 错误处理：记录错误日志并返回错误响应
                server.log.error({
                    action: 'bilibili_download_error',
                    error: error.message,
                    stack: error.stack
                }, 'B 站视频下载失败');

                // 根据错误类型返回不同的状态码
                const statusCode = determineErrorStatusCode(error);

                return reply.code(statusCode).send({
                    success: false,
                    error: error.message || '下载失败'
                });
            }
        }
    );
}

/**
 * 根据错误类型确定 HTTP 状态码
 *
 * @param error - 错误对象
 * @returns HTTP 状态码
 */
function determineErrorStatusCode(error: any): number {
    const errorMessage = error.message || '';

    // 400 Bad Request - 客户端错误
    if (
        errorMessage.includes('无效的') ||
        errorMessage.includes('缺少') ||
        errorMessage.includes('不存在') ||
        errorMessage.includes('未指定')
    ) {
        return 400;
    }

    // 404 Not Found - 资源不存在
    if (
        errorMessage.includes('找不到') ||
        errorMessage.includes('不存在')
    ) {
        return 404;
    }

    // 403 Forbidden - 权限问题
    if (
        errorMessage.includes('权限') ||
        errorMessage.includes('无执行权限')
    ) {
        return 403;
    }

    // 500 Internal Server Error - 服务器错误
    return 500;
}
