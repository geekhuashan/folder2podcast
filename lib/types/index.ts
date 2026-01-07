/**
 * 前端类型定义
 */

// JSend 响应类型
export interface JSendSuccess<T> {
  status: 'success';
  data: T;
}

export interface JSendFail<T = Record<string, string>> {
  status: 'fail';
  data: T;
}

export interface JSendError {
  status: 'error';
  message: string;
  code?: number;
  data?: any;
}

export type JSendResponse<T> = JSendSuccess<T> | JSendFail | JSendError;

// 播客类型
export interface Podcast {
  id: string;
  userId: string;
  username: string;
  dirName: string;
  title: string;
  description: string;
  author: string;
  email: string | null;
  websiteUrl: string | null;
  category: string;
  language: string;
  explicit: boolean;
  inheritanceEnabled: boolean;
  imageUrl: string | null;
  feedUrl: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 剧集类型
export interface Episode {
  id: string;
  podcastId: string;
  fileName: string;
  fileSize: number;
  title: string;
  description: string;
  duration: number | null;
  audioUrl: string;
  imageUrl: string | null;
  coverFileName: string | null;
  sortOrder: number | null;
  pubDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 创建播客请求
export interface CreatePodcastRequest {
  dirName: string;
  title: string;
  description?: string;
  author: string;
  email?: string;
  category?: string;
  language?: string;
  explicit?: boolean;
}

// 更新播客请求
export interface UpdatePodcastRequest {
  dirName?: string;
  title?: string;
  description?: string;
  author?: string;
  email?: string;
  category?: string;
  language?: string;
  explicit?: boolean;
  inheritanceEnabled?: boolean;
}

// 上传文件响应
export interface UploadFileResponse {
  fileName: string;
  fileSize: number;
  message: string;
}

// 剧集列表响应
export interface EpisodesResponse {
  episodes: Episode[];
  total: number;
}

// 带路径信息的文件对象（用于嵌套文件夹上传）
export interface FileWithPath {
  file: File;              // 原始 File 对象
  relativePath: string;    // 相对路径（例如: "第一季/001.mp3"）
  displayName: string;     // 原始文件名（例如: "001.mp3"）
  flattenedName: string;   // 扁平化文件名（例如: "第一季-001.mp3"）
}
