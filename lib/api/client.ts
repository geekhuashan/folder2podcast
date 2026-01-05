/**
 * API 客户端工具函数
 */

import type {
  JSendResponse,
  Podcast,
  Episode,
  CreatePodcastRequest,
  UpdatePodcastRequest,
  UploadFileResponse,
  EpisodesResponse,
} from '@/lib/types';

const API_BASE = '/api/v1';

// 从 localStorage 获取 Access Key
function getAccessKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessKey');
}

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<JSendResponse<T>> {
  const accessKey = getAccessKey();

  // 调试日志：检查 Access Key 是否存在
  if (!accessKey) {
    console.warn('[apiRequest] No access key found in localStorage');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // 添加 Authorization header
  if (accessKey) {
    headers['Authorization'] = `Bearer ${accessKey}`;
    console.log(`[apiRequest] ${options.method || 'GET'} ${endpoint} - Auth header set`);
  } else {
    console.error(`[apiRequest] ${options.method || 'GET'} ${endpoint} - No auth header!`);
  }

  // 如果 body 是对象且不是 FormData，自动序列化为 JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  // 调试日志：记录响应状态
  if (!response.ok) {
    console.error(`[apiRequest] ${options.method || 'GET'} ${endpoint} - ${response.status} ${response.statusText}`, data);
  }

  return data as JSendResponse<T>;
}

// 播客 API
export const podcastsAPI = {
  // 获取播客列表
  async list(): Promise<JSendResponse<Podcast[]>> {
    return apiRequest<Podcast[]>('/podcasts');
  },

  // 创建播客
  async create(data: CreatePodcastRequest): Promise<JSendResponse<Podcast>> {
    return apiRequest<Podcast>('/podcasts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 获取播客详情
  async get(username: string, dirName: string): Promise<JSendResponse<Podcast>> {
    return apiRequest<Podcast>(`/podcasts/${username}/${encodeURIComponent(dirName)}`);
  },

  // 更新播客
  async update(username: string, dirName: string, data: UpdatePodcastRequest): Promise<JSendResponse<Podcast>> {
    return apiRequest<Podcast>(`/podcasts/${username}/${encodeURIComponent(dirName)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除播客
  async delete(username: string, dirName: string, deleteFiles: boolean = false): Promise<JSendResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(
      `/podcasts/${username}/${encodeURIComponent(dirName)}?deleteFiles=${deleteFiles}`,
      {
        method: 'DELETE',
      }
    );
  },

  // 获取剧集列表
  async getEpisodes(username: string, dirName: string): Promise<JSendResponse<EpisodesResponse>> {
    return apiRequest<EpisodesResponse>(`/podcasts/${username}/${encodeURIComponent(dirName)}/episodes`);
  },

  // 上传播客封面
  async uploadCover(username: string, dirName: string, file: File): Promise<JSendResponse<{
    message: string;
    coverUrl: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest(`/podcasts/${username}/${encodeURIComponent(dirName)}/cover`, {
      method: 'POST',
      body: formData,
    });
  },

  // 删除播客封面
  async deleteCover(username: string, dirName: string): Promise<JSendResponse<{
    message: string;
  }>> {
    return apiRequest(`/podcasts/${username}/${encodeURIComponent(dirName)}/cover`, {
      method: 'DELETE',
    });
  },
};

// 上传 API
export const uploadAPI = {
  // 上传音频文件
  async uploadAudio(file: File, podcastId: string): Promise<JSendResponse<UploadFileResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('podcastId', podcastId);

    return apiRequest<UploadFileResponse>('/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

// 认证 API
export const authAPI = {
  // 密码登录
  async login(username: string, password: string): Promise<JSendResponse<{
    userId: string;
    username: string;
    accessKey: string;
  }>> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  // 用户注册
  async register(username: string, password: string): Promise<JSendResponse<{
    userId: string;
    username: string;
    accessKey: string;
  }>> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  // 获取当前用户信息（需要 Authorization header）
  async me(accessKey: string): Promise<JSendResponse<{
    userId: string;
    username: string;
  }>> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessKey}`,
      },
    });
    return response.json();
  },
};

// 剧集 API
export const episodesAPI = {
  // 更新剧集元数据
  async update(
    username: string,
    dirName: string,
    episodeId: string,
    data: {
      title?: string;
      description?: string;
      sortOrder?: number;
      pubDate?: Date | string;
    }
  ): Promise<JSendResponse<Episode>> {
    return apiRequest<Episode>(`/podcasts/${username}/${encodeURIComponent(dirName)}/episodes/${episodeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除剧集
  async delete(username: string, dirName: string, episodeId: string): Promise<JSendResponse<{ message: string; deletedEpisodeId: string }>> {
    return apiRequest<{ message: string; deletedEpisodeId: string }>(
      `/podcasts/${username}/${encodeURIComponent(dirName)}/episodes/${episodeId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // 上传剧集封面
  async uploadCover(username: string, dirName: string, episodeId: string, file: File): Promise<JSendResponse<{
    message: string;
    coverUrl: string;
    coverFileName: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<{
      message: string;
      coverUrl: string;
      coverFileName: string;
    }>(`/podcasts/${username}/${encodeURIComponent(dirName)}/episodes/${episodeId}/cover`, {
      method: 'POST',
      body: formData,
    });
  },

  // 删除剧集封面
  async deleteCover(username: string, dirName: string, episodeId: string): Promise<JSendResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(
      `/podcasts/${username}/${encodeURIComponent(dirName)}/episodes/${episodeId}/cover`,
      {
        method: 'DELETE',
      }
    );
  },

  // 批量排序预览
  async reorderPreview(username: string, dirName: string, strategy: string): Promise<JSendResponse<any>> {
    return apiRequest<any>(`/podcasts/${username}/${encodeURIComponent(dirName)}/episodes/reorder`, {
      method: 'POST',
      body: JSON.stringify({ strategy, action: 'preview' }),
    });
  },

  // 批量排序应用
  async reorderApply(username: string, dirName: string, strategy: string): Promise<JSendResponse<{
    message: string;
    strategy: string;
    total: number;
    changed: number;
  }>> {
    return apiRequest<{
      message: string;
      strategy: string;
      total: number;
      changed: number;
    }>(`/podcasts/${username}/${encodeURIComponent(dirName)}/episodes/reorder`, {
      method: 'POST',
      body: JSON.stringify({ strategy, action: 'apply' }),
    });
  },
};

// Access Key 和用户信息管理
export const accessKeyManager = {
  get(): string | null {
    return getAccessKey();
  },

  set(key: string, username?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessKey', key);
      if (username) {
        localStorage.setItem('username', username);
      }
    }
  },

  getUsername(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('username');
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessKey');
      localStorage.removeItem('username');
    }
  },

  isSet(): boolean {
    return !!getAccessKey();
  },
};
