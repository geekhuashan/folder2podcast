/**
 * 播客相关 Schemas
 */

import { z } from 'zod';

/**
 * 播客模型
 */
export const Podcast = z.object({
  id: z.string().uuid().describe('播客ID'),
  userId: z.string().uuid().describe('用户ID'),
  dirName: z.string().describe('目录名'),
  title: z.string().describe('播客标题'),
  description: z.string().describe('播客描述'),
  author: z.string().describe('作者'),
  email: z.string().email().optional().describe('联系邮箱'),
  websiteUrl: z.string().url().optional().describe('网站URL'),
  language: z.string().default('zh-cn').describe('语言'),
  category: z.string().default('Technology').describe('分类'),
  explicit: z.boolean().default(false).describe('是否包含敏感内容'),
  coverImage: z.string().nullable().describe('封面图片URL'),
  createdAt: z.string().datetime().describe('创建时间'),
  updatedAt: z.string().datetime().describe('更新时间'),
});

/**
 * 播客列表项（包含 feedUrl）
 */
export const PodcastWithFeedUrl = Podcast.extend({
  feedUrl: z.string().url().describe('RSS Feed URL'),
});

/**
 * 创建播客请求
 */
export const CreatePodcastRequest = z.object({
  dirName: z
    .string()
    .min(1, '目录名不能为空')
    .max(100, '目录名最多100个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '目录名只能包含字母、数字、下划线和连字符')
    .describe('目录名（URL友好）'),
  title: z
    .string()
    .min(1, '标题不能为空')
    .max(200, '标题最多200个字符')
    .describe('播客标题'),
  description: z.string().max(1000).optional().default('').describe('播客描述'),
  author: z.string().max(100).optional().default('').describe('作者'),
  email: z.union([z.string().email(), z.literal('')]).optional().describe('联系邮箱'),
  websiteUrl: z.union([z.string().url(), z.literal('')]).optional().describe('网站URL'),
  language: z.string().default('zh-CN').describe('语言代码'),
  category: z.string().default('Technology').describe('播客分类'),
  explicit: z.boolean().default(false).describe('是否包含敏感内容'),
  inheritanceEnabled: z.boolean().default(true).describe('剧集是否继承播客设置'),
});

/**
 * 更新播客请求（所有字段可选，包括 dirName）
 */
export const UpdatePodcastRequest = CreatePodcastRequest.partial();

/**
 * Episode 模型
 */
export const Episode = z.object({
  id: z.string().uuid().describe('剧集ID'),
  podcastId: z.string().uuid().describe('播客ID'),
  title: z.string().describe('剧集标题'),
  description: z.string().describe('剧集描述'),
  audioUrl: z.string().url().describe('音频URL'),
  duration: z.number().int().min(0).describe('时长（秒）'),
  fileSize: z.number().int().min(0).describe('文件大小（字节）'),
  mimeType: z.string().describe('MIME类型'),
  coverImage: z.string().nullable().describe('封面图片URL'),
  episodeNumber: z.number().int().min(1).describe('剧集编号'),
  seasonNumber: z.number().int().min(1).optional().describe('季号'),
  explicit: z.boolean().default(false).describe('是否包含敏感内容'),
  publishedAt: z.string().datetime().describe('发布时间'),
  createdAt: z.string().datetime().describe('创建时间'),
  updatedAt: z.string().datetime().describe('更新时间'),
});

/**
 * 剧集列表响应
 */
export const EpisodeListResponse = z.array(Episode);

/**
 * 路径参数：播客ID
 */
export const PodcastIdParam = z.object({
  id: z.string().uuid().describe('播客ID'),
});

/**
 * 路径参数：剧集ID
 */
export const EpisodeIdParam = z.object({
  episodeId: z.string().uuid().describe('剧集ID'),
});

/**
 * 播客详情响应（包含剧集数量）
 */
export const PodcastDetailResponse = PodcastWithFeedUrl.extend({
  episodeCount: z.number().int().min(0).describe('剧集数量'),
});

/**
 * 删除播客响应
 */
export const DeletePodcastResponse = z.object({
  message: z.string().describe('删除成功消息'),
  filesDeleted: z.boolean().describe('是否删除了文件'),
});

/**
 * 更新剧集请求
 */
export const UpdateEpisodeRequest = z.object({
  title: z.string().min(1).max(200).optional().describe('剧集标题'),
  description: z.string().max(2000).optional().describe('剧集描述'),
  sortOrder: z.number().int().min(1).optional().describe('排序顺序'),
  pubDate: z.string().datetime().optional().describe('发布日期'),
});

/**
 * 删除剧集响应
 */
export const DeleteEpisodeResponse = z.object({
  message: z.string().describe('删除成功消息'),
  deletedEpisodeId: z.string().uuid().describe('已删除的剧集ID'),
});

/**
 * 剧集重排序请求
 */
export const ReorderEpisodesRequest = z.object({
  episodeIds: z.array(z.string().uuid()).min(1).describe('剧集ID列表（按新顺序）'),
});

/**
 * 剧集重排序响应
 */
export const ReorderEpisodesResponse = z.object({
  message: z.string().describe('重排序成功消息'),
  updatedCount: z.number().int().min(0).describe('更新的剧集数量'),
});

/**
 * 排序策略
 */
export const SortStrategy = z.enum(['prefix', 'suffix', 'first', 'last', 'date']).describe('排序策略');

/**
 * 排序动作
 */
export const ReorderAction = z.enum(['preview', 'apply']).describe('排序动作：preview=预览，apply=应用');

/**
 * 剧集重排序请求（新版）
 */
export const ReorderEpisodesRequestV2 = z.object({
  strategy: SortStrategy.describe('排序策略'),
  action: ReorderAction.describe('排序动作'),
});

/**
 * 剧集重排序预览项
 */
export const ReorderPreviewItem = z.object({
  id: z.string().uuid().describe('剧集ID'),
  title: z.string().describe('剧集标题'),
  oldSortOrder: z.number().int().describe('原排序号'),
  newSortOrder: z.number().int().describe('新排序号'),
  changed: z.boolean().describe('是否发生变化'),
});

/**
 * 剧集重排序预览响应
 */
export const ReorderPreviewResponse = z.object({
  strategy: SortStrategy.describe('排序策略'),
  total: z.number().int().min(0).describe('总剧集数'),
  changed: z.number().int().min(0).describe('变化数量'),
  episodes: z.array(ReorderPreviewItem).describe('剧集列表'),
});

/**
 * 剧集重排序应用响应
 */
export const ReorderApplyResponse = z.object({
  message: z.string().describe('重排序成功消息'),
  strategy: SortStrategy.describe('使用的排序策略'),
  total: z.number().int().min(0).describe('总剧集数'),
  changed: z.number().int().min(0).describe('更新数量'),
});

/**
 * 上传剧集封面响应
 */
export const UploadEpisodeCoverResponse = z.object({
  message: z.string().describe('上传成功消息'),
  coverUrl: z.string().url().describe('封面URL'),
  coverFileName: z.string().describe('封面文件名'),
});

/**
 * 删除剧集封面响应
 */
export const DeleteEpisodeCoverResponse = z.object({
  message: z.string().describe('删除成功消息'),
});

/**
 * 上传音频文件响应
 */
export const UploadAudioResponse = z.object({
  fileName: z.string().describe('文件名'),
  fileSize: z.number().int().min(0).describe('文件大小（字节）'),
  message: z.string().describe('上传成功消息'),
});
