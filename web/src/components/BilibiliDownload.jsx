import { createSignal, Show, For, createEffect } from 'solid-js';
import { useToast } from './Toast';
import { taskManager } from '../utils/taskManager';

/**
 * 视频平台定义
 */
const VIDEO_PLATFORMS = [
  {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    enabled: true,
    placeholder: 'BV1qt4y1X7TW 或完整 URL',
    tips: [
      '粘贴视频链接后会自动获取视频信息',
      '多分P视频默认全选，可手动调整',
      '下载进度会显示在右下角的任务中心',
      '完成后会自动刷新播客列表',
      '支持格式：完整URL、短链接、BV号、AV号'
    ]
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    enabled: false,
    placeholder: '抖音视频链接',
    tips: []
  },
  {
    id: 'xigua',
    name: '西瓜视频',
    icon: '🍉',
    enabled: false,
    placeholder: '西瓜视频链接',
    tips: []
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    enabled: false,
    placeholder: 'YouTube 视频链接',
    tips: []
  }
];

/**
 * 格式化时长（秒）为可读字符串
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }
}

/**
 * 防抖函数
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 视频下载组件（简化版 - 使用统一任务中心）
 *
 * 所有下载任务通过 taskManager 管理
 * 进度显示在右下角的浮动任务窗口
 */
export default function BilibiliDownload(props) {
  const toast = useToast();

  // ========== 基础状态 ==========
  const [activePlatform, setActivePlatform] = createSignal('bilibili');
  const [url, setUrl] = createSignal('');
  const [selectedPodcast, setSelectedPodcast] = createSignal('');
  const [episodeTitle, setEpisodeTitle] = createSignal('');
  const [showAdvanced, setShowAdvanced] = createSignal(false);

  // ========== 视频信息状态 ==========
  const [videoInfo, setVideoInfo] = createSignal(null);
  const [fetchingInfo, setFetchingInfo] = createSignal(false);
  const [selectedPages, setSelectedPages] = createSignal([]);

  // ========== 提交状态 ==========
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // ========== 获取当前平台配置 ==========
  const getCurrentPlatform = () => {
    return VIDEO_PLATFORMS.find(p => p.id === activePlatform());
  };

  // ========== URL 改变时自动获取视频信息（防抖500ms）==========
  const debouncedFetchInfo = debounce((videoUrl) => {
    if (!videoUrl || videoUrl.length < 10) {
      setVideoInfo(null);
      setSelectedPages([]);
      return;
    }
    handleFetchInfo();
  }, 500);

  createEffect(() => {
    const currentUrl = url();
    debouncedFetchInfo(currentUrl.trim());
  });

  /**
   * 处理平台切换
   */
  const handlePlatformSwitch = (platformId) => {
    const platform = VIDEO_PLATFORMS.find(p => p.id === platformId);
    if (!platform.enabled) {
      toast.info(`${platform.name} 即将推出，敬请期待`);
      return;
    }
    setActivePlatform(platformId);
    // 切换平台时清空表单
    resetForm();
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setUrl('');
    setEpisodeTitle('');
    setShowAdvanced(false);
    setVideoInfo(null);
    setSelectedPages([]);
    setIsSubmitting(false);
  };

  /**
   * 获取视频信息（包括分P列表）
   */
  const handleFetchInfo = async () => {
    const videoUrl = url().trim();
    if (!videoUrl) {
      setVideoInfo(null);
      setSelectedPages([]);
      return;
    }

    setFetchingInfo(true);
    setVideoInfo(null);
    setSelectedPages([]);

    try {
      const response = await fetch('/api/bilibili/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取视频信息失败');
      }

      setVideoInfo(result.data);

      // 默认全选所有分P
      if (result.data.pages && result.data.pages.length > 0) {
        setSelectedPages(result.data.pages.map(p => p.index));
      }

      // 静默成功，不显示toast
    } catch (error) {
      console.error('获取视频信息失败:', error);
      // 失败时也静默，避免打扰用户
    } finally {
      setFetchingInfo(false);
    }
  };

  /**
   * 切换分P选择
   */
  const togglePage = (pageIndex) => {
    setSelectedPages(prev => {
      if (prev.includes(pageIndex)) {
        return prev.filter(idx => idx !== pageIndex);
      } else {
        return [...prev, pageIndex].sort((a, b) => a - b);
      }
    });
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    const info = videoInfo();
    if (!info || !info.pages) return;

    if (selectedPages().length === info.pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(info.pages.map(p => p.index));
    }
  };

  /**
   * 快捷选择：前10集
   */
  const selectFirst10 = () => {
    const info = videoInfo();
    if (!info || !info.pages) return;
    const first10 = info.pages.slice(0, 10).map(p => p.index);
    setSelectedPages(first10);
  };

  /**
   * 快捷选择：后10集
   */
  const selectLast10 = () => {
    const info = videoInfo();
    if (!info || !info.pages) return;
    const last10 = info.pages.slice(-10).map(p => p.index);
    setSelectedPages(last10);
  };

  /**
   * 处理提交下载（使用 taskManager）
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const videoUrl = url().trim();
    if (!videoUrl) {
      toast.error('请输入视频地址');
      return;
    }

    if (!selectedPodcast()) {
      toast.error('请选择目标播客');
      return;
    }

    const info = videoInfo();

    // 如果是多分P视频但没有选择任何分P
    if (info && info.isMultiPage && selectedPages().length === 0) {
      toast.error('请至少选择一个分P');
      return;
    }

    // 构建任务参数
    const taskData = {
      url: videoUrl,
      podcastName: selectedPodcast(),
      autoCreatePodcast: false,
    };

    if (episodeTitle().trim()) {
      taskData.episodeTitle = episodeTitle().trim();
    }

    // 添加分P选择参数
    if (info && info.isMultiPage && selectedPages().length > 0) {
      if (selectedPages().length === info.pages.length) {
        taskData.selectPage = 'ALL';
      } else {
        taskData.selectPage = selectedPages().join(',');
      }
    }

    // 使用 taskManager 添加下载任务
    try {
      setIsSubmitting(true);

      await taskManager.addTask(taskData);

      toast.success('下载任务已添加到任务中心');

      // 清空表单（保留播客选择）
      const podcast = selectedPodcast();
      resetForm();
      setSelectedPodcast(podcast);

    } catch (error) {
      toast.error(error.message || '创建下载任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 检查是否可以提交
  const canSubmit = () => {
    const info = videoInfo();

    if (!url().trim() || !selectedPodcast()) {
      return false;
    }

    if (info && info.isMultiPage && selectedPages().length === 0) {
      return false;
    }

    // 提交中时不能再次提交
    if (isSubmitting()) {
      return false;
    }

    return true;
  };

  return (
    <section class="section-card download-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Video Import</p>
          <h2 style={{ margin: 0 }}>视频下载与导入</h2>
          <p>粘贴链接后会自动获取视频信息，选择播客即可开始下载，进度会实时显示在下方。</p>
        </div>
      </div>

      <div class="platform-tabs">
        <For each={VIDEO_PLATFORMS}>
          {(platform) => (
            <button
              type="button"
              class={`platform-tab ${activePlatform() === platform.id ? 'is-active' : ''} ${platform.enabled ? '' : 'is-disabled'}`}
              onClick={() => handlePlatformSwitch(platform.id)}
            >
              <span>{platform.icon}</span>
              <span>{platform.name}</span>
              <Show when={!platform.enabled}>
                <span style={{ fontSize: '0.75rem' }}>Soon</span>
              </Show>
            </button>
          )}
        </For>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>
        {/* 基础表单 */}
        <div class="form-grid">
          <div>
            <div class="field-label">视频链接</div>
            <input
              type="text"
              class="input"
              placeholder={getCurrentPlatform().placeholder}
              value={url()}
              onInput={(e) => setUrl(e.target.value)}
              disabled={isSubmitting()}
            />
            <Show when={fetchingInfo()}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                正在获取视频信息...
              </div>
            </Show>
          </div>
          <div>
            <div class="field-label">目标播客</div>
            <select
              value={selectedPodcast()}
              onChange={(e) => setSelectedPodcast(e.target.value)}
              disabled={isSubmitting()}
            >
              <option value="">请选择播客</option>
              <For each={props.podcasts}>
                {(podcast) => (
                  <option value={podcast.dirName}>
                    {podcast.title} ({podcast.episodeCount || 0} 集)
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        {/* 视频信息和分P选择 */}
        <Show when={videoInfo()}>
          {(info) => (
            <div style={{
              padding: '1.25rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              'border-radius': 'var(--radius)',
              border: '1px solid #bae6fd'
            }}>
              {/* 视频基本信息 */}
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 3h4v4M8 3H4v4"/>
                  </svg>
                  <h3 style={{ margin: 0, 'font-size': '1.1rem', 'font-weight': '600', color: '#0c4a6e' }}>
                    {info().title}
                  </h3>
                </div>
                <Show when={info().author}>
                  <p style={{ margin: '0 0 0 2rem', 'font-size': '0.875rem', color: '#0369a1' }}>
                    UP主: {info().author}
                  </p>
                </Show>
              </div>

              {/* 分P选择 */}
              <Show when={info().isMultiPage}>
                <div style={{
                  padding: '1rem',
                  background: 'white',
                  'border-radius': 'var(--radius-sm)',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                    <div style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#0c4a6e' }}>
                      选择要下载的分P ({selectedPages().length} / {info().pages.length})
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        class="btn btn-soft btn-sm"
                        onClick={toggleSelectAll}
                        disabled={isSubmitting()}
                      >
                        {selectedPages().length === info().pages.length ? '取消全选' : '全选'}
                      </button>
                      <Show when={info().pages.length > 10}>
                        <button
                          type="button"
                          class="btn btn-soft btn-sm"
                          onClick={selectFirst10}
                          disabled={isSubmitting()}
                        >
                          前10集
                        </button>
                        <button
                          type="button"
                          class="btn btn-soft btn-sm"
                          onClick={selectLast10}
                          disabled={isSubmitting()}
                        >
                          后10集
                        </button>
                      </Show>
                    </div>
                  </div>

                  {/* 分P列表 */}
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '0.5rem',
                    'max-height': '300px',
                    'overflow-y': 'auto',
                    padding: '0.5rem'
                  }}>
                    <For each={info().pages}>
                      {(page) => (
                        <label style={{
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          'border-radius': 'var(--radius-sm)',
                          border: '1px solid',
                          'border-color': selectedPages().includes(page.index) ? '#0ea5e9' : '#e5e7eb',
                          background: selectedPages().includes(page.index) ? '#f0f9ff' : 'white',
                          cursor: isSubmitting() ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting() ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedPages().includes(page.index)}
                            onChange={() => togglePage(page.index)}
                            disabled={isSubmitting()}
                            style={{
                              width: '1.125rem',
                              height: '1.125rem',
                              cursor: isSubmitting() ? 'not-allowed' : 'pointer',
                              'flex-shrink': 0
                            }}
                          />
                          <div style={{ flex: 1, 'min-width': 0 }}>
                            <div style={{
                              'font-size': '0.875rem',
                              'font-weight': '500',
                              color: selectedPages().includes(page.index) ? '#0369a1' : 'var(--text)',
                              overflow: 'hidden',
                              'text-overflow': 'ellipsis',
                              'white-space': 'nowrap'
                            }}>
                              P{page.index}: {page.title}
                            </div>
                            <Show when={page.duration}>
                              <div style={{
                                'font-size': '0.75rem',
                                color: 'var(--text-muted)',
                                'margin-top': '0.25rem'
                              }}>
                                时长: {formatDuration(page.duration)}
                              </div>
                            </Show>
                          </div>
                        </label>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          )}
        </Show>

        {/* 高级选项 */}
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '1rem', 'flex-wrap': 'wrap' }}>
          <div>
            <div class="field-label" style={{ margin: 0 }}>高级选项</div>
            <p class="text-sm" style={{ margin: 0 }}>
              自定义剧集标题，可覆盖下载源的默认标题。
            </p>
          </div>
          <button
            type="button"
            class="btn btn-soft btn-sm"
            onClick={() => setShowAdvanced(!showAdvanced())}
            disabled={isSubmitting()}
          >
            {showAdvanced() ? '收起' : '展开'}高级选项
          </button>
        </div>

        <Show when={showAdvanced()}>
          <div class="advanced-panel" style={{ padding: '1rem', border: '1px dashed var(--border)', background: 'var(--surface-soft)', 'border-radius': 'var(--radius-sm)' }}>
            <div class="field-label">自定义剧集标题</div>
            <input
              type="text"
              class="input"
              placeholder="可选，例如：第 12 期 B 站访谈"
              value={episodeTitle()}
              onInput={(e) => setEpisodeTitle(e.target.value)}
              disabled={isSubmitting()}
            />
          </div>
        </Show>

        {/* 提交按钮 */}
        <div style={{ display: 'flex', gap: '0.75rem', 'padding-top': '0.5rem' }}>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!canSubmit()}
            style={{ flex: 1 }}
          >
            {isSubmitting() ? '提交中...' : '添加到下载队列'}
          </button>
        </div>

        <div class="divider"></div>

        {/* 提示信息 */}
        <div style={{ background: 'var(--accent-soft)', padding: '1rem', 'border-radius': 'var(--radius-sm)' }}>
          <ul class="tips-list" style={{ margin: 0, 'padding-left': '1.2rem' }}>
            <For each={getCurrentPlatform().tips}>
              {(tip) => <li>{tip}</li>}
            </For>
          </ul>
        </div>
      </form>
    </section>
  );
}
