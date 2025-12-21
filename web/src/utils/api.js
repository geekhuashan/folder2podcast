// API 基础配置
const API_BASE = '/api/v2';
const API_KEY = new URLSearchParams(window.location.search).get('apiKey') || '';

// 添加 API Key 到 URL
const addApiKey = (url) => {
  if (!API_KEY) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}apiKey=${API_KEY}`;
};

// 通用请求函数
async function request(url, options = {}) {
  try {
    const response = await fetch(addApiKey(url), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// 播客 API
export const podcastsAPI = {
  // 获取所有播客
  async getAll() {
    return request(`${API_BASE}/podcasts`);
  },

  // 创建新播客
  async create(podcastData) {
    return request(`${API_BASE}/manage/podcasts`, {
      method: 'POST',
      body: JSON.stringify(podcastData),
    });
  },

  // 删除播客
  async delete(podcastDir) {
    return request(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}`, {
      method: 'DELETE',
    });
  },

  // 获取播客文件列表
  async getFiles(podcastDir) {
    return request(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files`);
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
      const url = addApiKey(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files`);
      xhr.open('POST', url);
      xhr.send(formData);
    });
  },

  // 上传文件（原有方法，保持向后兼容）
  async uploadFile(podcastDir, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      addApiKey(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/files`),
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

  // 获取配置
  async getConfig(podcastDir) {
    return request(`${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/config`);
  },

  // 更新配置
  async updateConfig(podcastDir, config) {
    return request(
      `${API_BASE}/manage/podcasts/${encodeURIComponent(podcastDir)}/config`,
      {
        method: 'PUT',
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
