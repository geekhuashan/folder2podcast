import { FastifyInstance, FastifyRequest } from 'fastify';
import { FileManagementService } from '../services/file-management.service';
import { requireAuth } from '../middleware/auth.middleware';
import { db } from '../db';
import { episodes } from '../db/schema';
import { eq } from 'drizzle-orm';
import { insertEpisodeOnFileUpload } from '../services/podcast';
import { getStorage } from '../services/storage';

/**
 * 文件管理路由
 * 提供文件上传、删除、重命名等功能
 */
export async function registerFileManagementRoutes(server: FastifyInstance) {
  const fileService = new FileManagementService();

  /**
   * 上传文件到播客目录
   * POST /api/manage/podcasts/:dirName/files
   */
  server.post<{
    Params: { dirName: string };
  }>(
    '/api/manage/podcasts/:dirName/files',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        // 获取上传的文件
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' });
        }

        const fileName = data.filename;
        const fileBuffer = await data.toBuffer();

        // 从 URL 参数获取用户名（requireAuth 中间件已验证）
        const { username } = (request.query as { username?: string });
        const userId = username || 'guest';

        // 保存文件
        await fileService.saveFile(userId, request.params.dirName, fileName, fileBuffer);

        // ✅ 立即插入数据库
        const podcastId = `${userId}:${request.params.dirName}`;
        const storage = getStorage();
        const filePath = `audio/${userId}/${request.params.dirName}/${fileName}`;
        const fileStats = await storage.getFileStats(filePath);

        await insertEpisodeOnFileUpload({
          podcastId,
          fileName,
          fileSize: fileStats.size,
          title: fileName, // 可从文件名提取更友好的标题
        });

        return {
          success: true,
          message: 'File uploaded successfully',
          fileName,
        };
      } catch (error: any) {
        console.error('File upload error:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * 删除文件
   * DELETE /api/manage/podcasts/:dirName/files/:fileName
   */
  server.delete<{
    Params: { dirName: string; fileName: string };
  }>(
    '/api/manage/podcasts/:dirName/files/:fileName',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        // 从 URL 参数获取用户名（requireAuth 中间件已验证）
        const { username } = (request.query as { username?: string });
        const userId = username || 'guest';
        const podcastId = `${userId}:${request.params.dirName}`;
        const fileName = decodeURIComponent(request.params.fileName);

        // 1. 删除文件系统中的文件
        await fileService.deleteFile(userId, request.params.dirName, fileName);

        // 2. 同步删除数据库中的剧集记录
        const episodeId = `${podcastId}:${fileName}`;
        await db.delete(episodes).where(eq(episodes.id, episodeId));

        return {
          success: true,
          message: 'File deleted successfully',
        };
      } catch (error: any) {
        console.error('File delete error:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * 重命名文件
   * PATCH /api/manage/podcasts/:dirName/files/:fileName
   */
  server.patch<{
    Params: { dirName: string; fileName: string };
    Body: { newName: string };
  }>(
    '/api/manage/podcasts/:dirName/files/:fileName',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const { newName } = request.body;
        if (!newName) {
          return reply.code(400).send({ error: 'newName is required' });
        }

        // 从 URL 参数获取用户名（requireAuth 中间件已验证）
        const { username } = (request.query as { username?: string });
        const userId = username || 'guest';
        const podcastId = `${userId}:${request.params.dirName}`;
        const oldFileName = decodeURIComponent(request.params.fileName);

        // 1. 重命名文件系统中的文件
        await fileService.renameFile(userId, request.params.dirName, oldFileName, newName);

        // 2. 更新数据库中的剧集记录
        const oldEpisodeId = `${podcastId}:${oldFileName}`;
        const newEpisodeId = `${podcastId}:${newName}`;

        // 先查询旧记录（保留元数据）
        const oldEpisode = await db.select().from(episodes).where(eq(episodes.id, oldEpisodeId)).get();

        // 删除旧记录
        await db.delete(episodes).where(eq(episodes.id, oldEpisodeId));

        // 如果旧记录存在，插入新记录
        if (oldEpisode) {
          await db.insert(episodes).values({
            ...oldEpisode,
            id: newEpisodeId,
            fileName: newName,
            updatedAt: new Date(),
          });
        }

        return {
          success: true,
          message: 'File renamed successfully',
          newName,
        };
      } catch (error: any) {
        console.error('File rename error:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );
}
