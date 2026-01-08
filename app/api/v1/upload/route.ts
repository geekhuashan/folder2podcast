import { NextRequest } from 'next/server';
import { writeFile, access } from 'fs/promises';
import { join, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { podcasts, episodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/middleware/auth';
import { success, fail, error, jsonResponse, HTTP_STATUS } from '@/lib/utils/response';
import { getLocalPath } from '@/lib/utils/url';
import { isAudioFile, extractMetadataFromBuffer } from '@/lib/utils/audio';
import { clearFeedCache } from '@/lib/services/feed-data.service';
import { UploadAudioResponse } from '@/lib/schemas/podcast';
import { storageConfig } from '@/lib/config';
import { hasPodcastCover, copyDefaultCoverToPodcast, copyPodcastCoverToEpisode } from '@/lib/utils/cover';

// 导出 schemas 供 OpenAPI 生成器使用
export { UploadAudioResponse };

/**
 * 上传音频文件
 * @description 上传音频文件到指定播客（支持 MP3、M4A、WAV、FLAC、OGG、AAC）
 * @request multipart/form-data - file（音频文件）和 podcastId（播客ID）
 * @response 201 - SuccessResponse(UploadAudioResponse) - 上传成功
 * @security AccessKeyAuth
 * @openapi
 */
export async function POST(request: NextRequest) {
  // 1. 验证 Access Key
  const auth = await authenticateRequest(request);
  if (!auth) {
    return jsonResponse(
      error('Unauthorized', HTTP_STATUS.UNAUTHORIZED),
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  try {
    // 2. 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const podcastId = formData.get('podcastId') as string | null;
    const targetFileName = formData.get('targetFileName') as string | null;  // 新增：目标文件名

    // 3. 验证必填字段
    if (!file || !podcastId) {
      return jsonResponse(
        fail({
          file: file ? undefined : 'File is required',
          podcastId: podcastId ? undefined : 'Podcast ID is required',
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 4. 验证文件类型
    if (!isAudioFile(file.name)) {
      return jsonResponse(
        fail({
          file: 'Only audio files are allowed (.mp3, .m4a, .wav, .flac, .ogg, .aac)',
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 5. 验证文件大小
    if (file.size > storageConfig.maxAudioFileSize) {
      return jsonResponse(
        fail({
          file: `File size exceeds maximum limit of ${storageConfig.maxAudioFileSize / 1024 / 1024}MB`,
        }),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 6. 查询播客并验证所有权
    const podcast = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, podcastId))
      .limit(1)
      .get();

    if (!podcast) {
      return jsonResponse(
        fail({
          podcastId: 'Podcast not found',
        }),
        HTTP_STATUS.NOT_FOUND
      );
    }

    if (podcast.userId !== auth.userId) {
      return jsonResponse(
        error('You do not have permission to upload to this podcast', HTTP_STATUS.FORBIDDEN),
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 7. 确定最终文件名
    let finalFileName: string;

    if (targetFileName) {
      // 使用前端提供的扁平化文件名
      finalFileName = basename(targetFileName);  // 防止路径注入

      // 验证文件名安全性（防止恶意路径）
      if (finalFileName.includes('/') || finalFileName.includes('\\') || finalFileName.includes('..')) {
        return jsonResponse(
          fail({ targetFileName: 'Invalid file name' }),
          HTTP_STATUS.BAD_REQUEST
        );
      }
    } else {
      // 向后兼容：使用原始文件名
      finalFileName = basename(file.name);
    }

    // 8. 提取音频元数据
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 提取音频元数据（时长等）
    const metadata = await extractMetadataFromBuffer(buffer, finalFileName);

    const podcastDir = getLocalPath(podcast.userId, podcast.dirName);
    const filePath = join(podcastDir, finalFileName);

    // 9. 检查文件冲突（如果文件已存在，添加时间戳后缀）
    let actualFilePath = filePath;
    try {
      await access(actualFilePath);
      // 文件已存在，添加时间戳
      const ext = finalFileName.substring(finalFileName.lastIndexOf('.'));
      const base = finalFileName.substring(0, finalFileName.lastIndexOf('.'));
      const timestamp = Date.now();
      finalFileName = `${base}-${timestamp}${ext}`;
      actualFilePath = join(podcastDir, finalFileName);
      console.log(`[POST /api/v1/upload] File exists, renamed to: ${finalFileName}`);
    } catch {
      // 文件不存在，使用原文件名
    }

    // 10. 保存文件
    try {
      await writeFile(actualFilePath, buffer);
      console.log(`[POST /api/v1/upload] File saved: ${actualFilePath}`);
    } catch (err) {
      console.error('[POST /api/v1/upload] Failed to save file:', err);
      return jsonResponse(
        error('Failed to save file', HTTP_STATUS.INTERNAL_SERVER_ERROR),
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // 11. 确保播客有封面（如果没有，复制默认封面）
    try {
      if (!await hasPodcastCover(podcast.userId, podcast.dirName)) {
        await copyDefaultCoverToPodcast(podcast.userId, podcast.dirName);
        console.log(`[POST Upload] Initialized default cover for ${podcast.dirName}`);
      }
    } catch (err) {
      console.error('[POST Upload] Failed to check/initialize podcast cover:', err);
      // 不阻塞上传流程
    }

    // 12. 创建数据库记录
    try {
      const episodeId = uuidv4();

      // 应用写时继承逻辑
      let episodeDescription: string;

      if (podcast.inheritanceEnabled) {
        // 启用继承: 优先用元数据,否则用播客描述
        episodeDescription = metadata.album || metadata.artist || podcast.description || '';
      } else {
        // 禁用继承: 仅使用元数据
        episodeDescription = metadata.album || metadata.artist || '';
      }

      // 为每个剧集创建独立的封面文件（复制播客封面）
      let episodeCoverFileName: string;
      try {
        episodeCoverFileName = await copyPodcastCoverToEpisode(
          podcast.userId,
          podcast.dirName,
          episodeId
        );
        console.log(`[POST Upload] Created episode cover: ${episodeCoverFileName}`);
      } catch (err) {
        console.error('[POST Upload] Failed to create episode cover:', err);
        // 失败时使用播客封面作为兜底
        episodeCoverFileName = 'cover.jpg';
      }

      await db.insert(episodes).values({
        id: episodeId,
        podcastId: podcastId,
        fileName: finalFileName,  // 使用最终的文件名
        fileSize: file.size,
        title: metadata.title || finalFileName,
        description: episodeDescription,      // ✅ 不允许为 null
        pubDate: new Date(),
        duration: metadata.duration || 0,
        coverFileName: episodeCoverFileName,  // ✅ 统一格式：ep-{episodeId}.jpg
      });

      console.log(`[POST /api/v1/upload] Episode created: ${episodeId} (inheritanceEnabled: ${podcast.inheritanceEnabled}, description: "${episodeDescription.substring(0, 50)}", coverFileName: ${episodeCoverFileName})`);
    } catch (err) {
      console.error('[POST /api/v1/upload] Failed to create episode record:', err);
      // 文件已保存，数据库记录创建失败
      return jsonResponse(
        error('File saved but failed to create episode record', HTTP_STATUS.INTERNAL_SERVER_ERROR),
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // 13. 清除缓存
    clearFeedCache(podcastId);

    // 14. 返回成功响应
    return jsonResponse(
      success({
        fileName: finalFileName,  // 使用最终的文件名
        fileSize: file.size,
        message: 'File uploaded successfully',
      }),
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    console.error('[POST /api/v1/upload] Error:', err);
    return jsonResponse(
      error('Failed to upload file', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
