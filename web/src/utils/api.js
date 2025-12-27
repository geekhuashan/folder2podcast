// API 基础配置
const API_BASE = '/api';

// 从 localStorage 读取用户名和密码（登录后保存）
const getCredentials = () => {
  const username = localStorage.getItem('auth_username') || '';
  const password = localStorage.getItem('auth_password') || '';
  return { username, password };
};

// 添加认证信息到 URL
const addAuth = (url) => {
  const { username, password } = getCredentials();
  if (!username || !password) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
};

// 通用请求函数
async function request(url, options = {}) {
  try {
    // 只在有 body 的情况下设置 Content-Type
    const headers = { ...options.headers };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(addAuth(url), {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ====== 认证 API ======
export const authAPI = {
  // 登录（验证后端环境变量中的用户名密码）
  async login(username, password) {
    // 调用后端验证接口
    const result = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // 验证成功后保存到 localStorage
    localStorage.setItem('auth_username', username);
    localStorage.setItem('auth_password', password);

    return result;
  },

  // 登出（清除 localStorage）
  async logout() {
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_password');
    return { success: true };
  },

  // 获取当前用户（从 localStorage 读取）
  async getCurrentUser() {
    const username = localStorage.getItem('auth_username');
    if (!username) {
      throw new Error('未登录');
    }
    return {
      user: {
        id: username,
        username: username,
        nickname: '管理员',
      }
    };
  },
};

// 播客 API
export const podcastsAPI = {
  // 获取所有播客
  async getAll() {
    return request(`${API_BASE}/podcasts`);
  },

  // 创建新播客
  async create(podcastData) {
    return request(`${API_BASE}/podcasts`, {
      method: 'POST',
      body: JSON.stringify(podcastData),
    });
  },

  // 删除播客（默认同时删除文件）
  async delete(podcastId) {
    return request(`${API_BASE}/podcasts/${encodeURIComponent(podcastId)}?deleteFiles=true`, {
      method: 'DELETE',
    });
  },

  // 获取播客文件列表（通过扫描接口）
  async getFiles(podcastId) {
    return request(`${API_BASE}/podcasts/${encodeURIComponent(podcastId)}/episodes`);
  },

  // 上传文件（带进度回调）
  async uploadFileWithProgress(podcastDir, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // 监听上传进度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(e.loaded, e.total, percentComplete);
        }
      });

      // 监听上传完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // 监听上传错误
      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred'));
      });

      // 监听上传中止
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // 发送请求
      const url = addAuth(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files`);
      xhr.open('POST', url);
      xhr.send(formData);
    });
  },

  // 上传文件（原有方法，保持向后兼容）
  async uploadFile(podcastDir, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      addAuth(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files`),
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return await response.json();
  },

  // 删除文件
  async deleteFile(podcastDir, fileName) {
    return request(
      `${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files/${encodeURIComponent(fileName)}`,
      { method: 'DELETE' }
    );
  },

  // 重命名文件
  async renameFile(podcastDir, oldName, newName) {
    return request(
      `${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files/${encodeURIComponent(oldName)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ newName }),
      }
    );
  },

  // 获取配置（使用 GET /api/podcasts/:id 获取播客详情，包含配置）
  async getConfig(podcastId) {
    return request(`${API_BASE}/podcasts/${encodeURIComponent(podcastId)}`);
  },

  // 更新配置（使用 PATCH /api/podcasts/:id 更新播客配置）
  async updateConfig(podcastId, config) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(config),
      }
    );
  },

  // 更新元数据
  async updateMetadata(podcastDir, metadata) {
    return request(
      `${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/config/metadata`,
      {
        method: 'PATCH',
        body: JSON.stringify(metadata),
      }
    );
  },

  // 刷新缓存
  async refresh(podcastDir) {
    return request(
      `${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/refresh`,
      { method: 'POST' }
    );
  },
};

// 剧集元数据管理 API
export const episodesAPI = {
  // 获取播客的剧集列表
  async getEpisodes(podcastDir) {
    return request(`${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes`);
  },

  // 更新剧集元数据
  async updateMetadata(podcastDir, fileName, metadata) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/${encodeURIComponent(fileName)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(metadata),
      }
    );
  },

  // 删除剧集元数据
  async deleteMetadata(podcastDir, fileName) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/${encodeURIComponent(fileName)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // 上传剧集封面
  async uploadCover(podcastDir, fileName, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      addAuth(`${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/${encodeURIComponent(fileName)}/cover`),
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return await response.json();
  },

  // 删除剧集封面
  async deleteCover(podcastDir, fileName) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/${encodeURIComponent(fileName)}/cover`,
      {
        method: 'DELETE',
      }
    );
  },

  // ⭐ 重新发布剧集（version++ 并更新 pubDate）
  async republish(podcastDir, fileName) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/${encodeURIComponent(fileName)}/republish`,
      {
        method: 'POST',
      }
    );
  },

  // ⭐ 预览批量重新排序的结果（不实际修改数据库）
  async reorderPreview(podcastDir, strategy) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/reorder/preview`,
      {
        method: 'POST',
        body: JSON.stringify({ strategy }),
      }
    );
  },

  // ⭐ 批量重新排序剧集（根据文件名策略重新计算 sortOrder）
  async reorder(podcastDir, strategy) {
    return request(
      `${API_BASE}/podcasts/${encodeURIComponent(podcastDir)}/episodes/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ strategy }),
      }
    );
  },
};

// B 站下载 API
export const bilibiliAPI = {
  /**
   * 下载 B 站视频为音频
   * @param {Object} params - 下载参数
   * @param {string} params.url - B 站视频链接或 BV 号
   * @param {string} params.podcastName - 目标播客名称（可选）
   * @param {string} params.episodeTitle - 自定义剧集标题（可选）
   * @param {boolean} params.autoCreatePodcast - 是否自动创建播客（默认 true）
   * @returns {Promise} 下载结果
   */
  async download(params) {
    return request('/api/bilibili/download', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * 获取下载任务进度
   * @param {string} taskId - 任务 ID
   * @returns {Promise} 任务进度
   */
  async getTaskProgress(taskId) {
    return request(`/api/bilibili/tasks/${taskId}`);
  },
};
