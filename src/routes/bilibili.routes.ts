/**
 * B 站视频下载路由（保留原有实现）
 *
 * 说明：
 * - 保留原有的 B 站下载功能
 * - 暂时不重构，后续可以添加权限检查
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BilibiliDownloadService } from '../services/bilibili-download.service';
import { BilibiliDownloadRequest } from '../types';
import { requireAuth } from '../middleware/auth.middleware';

/**
 * 注册 B 站视频下载相关路由
 */
export async function registerBilibiliRoutes(server: FastifyInstance): Promise<void> {
  // 创建服务实例（暂时保留类实例化，后续可重构为函数式）
  const bilibiliService = new BilibiliDownloadService();
    /**
     * POST /api/bilibili/info
     * 获取 B 站视频信息（包括分P列表）
     *
     * 请求体:
     * {
     *   "url": "BV1qt4y1X7TW"  // 必需：B 站视频链接或 BV 号
     * }
     *
     * 响应:
     * {
     *   "success": true,
     *   "data": {
     *     "bvid": "BV1qt4y1X7TW",
     *     "title": "视频标题",
     *     "author": "UP主名称",
     *     "isMultiPage": true,
     *     "pages": [
     *       {
     *         "index": 1,
     *         "title": "第一集标题",
     *         "duration": 630
     *       }
     *     ]
     *   }
     * }
     */
    server.post<{ Body: { url: string } }>(
        '/api/bilibili/info',
        async (request: FastifyRequest<{ Body: { url: string } }>, reply: FastifyReply) => {
            try {
                // 1. 验证必需参数
                const { url } = request.body;
                if (!url) {
                    return reply.code(400).send({
                        success: false,
                        error: '缺少必需参数: url'
                    });
                }

                // 2. 记录请求日志
                server.log.info({
                    action: 'bilibili_info_fetch',
                    url
                }, '获取 B 站视频信息');

                // 3. 调用服务获取视频信息
                const videoInfo = await bilibiliService.getVideoInfo(url);

                server.log.info({
                    action: 'bilibili_info_success',
                    bvid: videoInfo.bvid,
                    title: videoInfo.title,
                    pageCount: videoInfo.pages.length
                }, '视频信息获取成功');

                // 4. 返回成功响应
                return reply.code(200).send({
                    success: true,
                    data: videoInfo
                });

            } catch (error: any) {
                // 错误处理
                server.log.error({
                    action: 'bilibili_info_error',
                    error: error.message,
                    stack: error.stack
                }, 'B 站视频信息获取失败');

                const statusCode = determineErrorStatusCode(error);

                return reply.code(statusCode).send({
                    success: false,
                    error: error.message || '获取视频信息失败'
                });
            }
        }
    );

    /**
     * POST /api/bilibili/download
     * 下载 B 站视频为音频并添加到播客（异步执行，立即返回 taskId）
     *
     * 请求体:
     * {
     *   "url": "BV1qt4y1X7TW",              // 必需：B 站视频链接或 BV 号
     *   "podcastName": "我的播客",            // 可选：目标播客名称
     *   "episodeTitle": "第一集",            // 可选：自定义剧集标题
     *   "autoCreatePodcast": true,          // 可选：是否自动创建播客（默认 true）
     *   "selectPage": "1,2,3"               // 可选：选择的分P页码，如 "1,2,3" 或 "ALL"
     * }
     *
     * 响应:
     * {
     *   "success": true,
     *   "data": {
     *     "taskId": "uuid-xxxx-xxxx-xxxx",
     *     "message": "下载任务已创建，请使用 taskId 查询进度"
     *   }
     * }
     */
    server.post<{ Body: BilibiliDownloadRequest }>(
        '/api/bilibili/download',
        { preHandler: requireAuth },
        async (request: FastifyRequest<{ Body: BilibiliDownloadRequest }>, reply: FastifyReply) => {
            try {
                // 1. 从 URL 参数获取用户名（requireAuth 中间件已验证）
                const { username } = (request.query as { username?: string });
                const userId = username || 'guest';

                // 2. 提取请求参数
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
                    userId,
                    url: downloadRequest.url,
                    podcastName: downloadRequest.podcastName,
                    episodeTitle: downloadRequest.episodeTitle
                }, '创建 B 站视频下载任务');

                // 4. 调用下载服务,传递 userId
                const taskId = await bilibiliService.startDownload(downloadRequest, userId);

                server.log.info({
                    action: 'bilibili_task_created',
                    taskId,
                    url: downloadRequest.url
                }, '下载任务已创建');

                // 5. 返回 taskId
                return reply.code(200).send({
                    success: true,
                    data: {
                        taskId,
                        message: '下载任务已创建，请使用 GET /api/bilibili/tasks/:taskId 查询进度'
                    }
                });

            } catch (error: any) {
                // 错误处理：记录错误日志并返回错误响应
                server.log.error({
                    action: 'bilibili_download_error',
                    error: error.message,
                    stack: error.stack
                }, 'B 站视频下载任务创建失败');

                // 根据错误类型返回不同的状态码
                const statusCode = determineErrorStatusCode(error);

                return reply.code(statusCode).send({
                    success: false,
                    error: error.message || '创建下载任务失败'
                });
            }
        }
    );

    /**
     * GET /api/bilibili/tasks/:taskId
     * 查询下载任务进度
     *
     * 路径参数:
     * - taskId: 任务 ID
     *
     * 响应:
     * {
     *   "success": true,
     *   "data": {
     *     "taskId": "uuid-xxxx-xxxx-xxxx",
     *     "status": "downloading",  // pending/downloading/completed/failed
     *     "percent": 50,
     *     "speed": "1.5 MB/s",
     *     "eta": "30秒",
     *     "current": 2,
     *     "total": 5,
     *     "url": "BV1qt4y1X7TW",
     *     "podcastName": "我的播客",
     *     "episodeTitle": "第一集",
     *     "fileName": "第一集.m4a",  // 完成后可用
     *     "filePaths": [...],        // 完成后可用
     *     "error": "错误信息",        // 失败时可用
     *     "createdAt": 1234567890,
     *     "updatedAt": 1234567890
     *   }
     * }
     */
    server.get<{ Params: { taskId: string } }>(
        '/api/bilibili/tasks/:taskId',
        async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
            try {
                const { taskId } = request.params;

                // 查询任务进度
                const progress = bilibiliService.getTaskProgress(taskId);

                if (!progress) {
                    return reply.code(404).send({
                        success: false,
                        error: `任务 ${taskId} 不存在或已过期`
                    });
                }

                // 任务完成后，RSS Feed 会在下次访问时重新从数据库生成

                return reply.code(200).send({
                    success: true,
                    data: progress
                });

            } catch (error: any) {
                server.log.error({
                    action: 'bilibili_task_query_error',
                    error: error.message
                }, '查询任务进度失败');

                return reply.code(500).send({
                    success: false,
                    error: error.message || '查询任务进度失败'
                });
            }
        }
    );

    /**
     * GET /api/bilibili/tasks
     * 获取所有下载任务（调试用）
     *
     * 响应:
     * {
     *   "success": true,
     *   "data": [
     *     { taskId: "...", status: "downloading", ... },
     *     { taskId: "...", status: "completed", ... }
     *   ]
     * }
     */
    server.get(
        '/api/bilibili/tasks',
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const tasks = bilibiliService.getAllTasks();

                return reply.code(200).send({
                    success: true,
                    data: tasks
                });

            } catch (error: any) {
                server.log.error({
                    action: 'bilibili_tasks_list_error',
                    error: error.message
                }, '获取任务列表失败');

                return reply.code(500).send({
                    success: false,
                    error: error.message || '获取任务列表失败'
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
