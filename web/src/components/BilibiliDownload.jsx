import { createSignal, Show, For, createEffect } from 'solid-js';
import { taskManager } from '../utils/taskManager';
import { useToast } from './Toast';

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
      '提交后任务会自动添加到下载队列',
      '可以继续添加更多任务，无需等待',
      '查看右下角浮动窗口了解下载进度',
      '支持格式：完整URL、短链接、BV号、AV号',
      '多分P视频可单独选择要下载的集数'
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
 * 视频下载组件（多平台支持）
 *
 * 这是一个重要的核心功能，放在首页顶部
 * 支持多个视频平台，当前只有 B站 可用
 */
export default function BilibiliDownload(props) {
  const toast = useToast();

  // 当前选中的平台
  const [activePlatform, setActivePlatform] = createSignal('bilibili');

  // 表单状态
  const [url, setUrl] = createSignal('');
  const [selectedPodcast, setSelectedPodcast] = createSignal('');
  const [episodeTitle, setEpisodeTitle] = createSignal('');

  // 高级选项展开状态
  const [showAdvanced, setShowAdvanced] = createSignal(false);

  // 视频信息状态
  const [videoInfo, setVideoInfo] = createSignal(null);
  const [fetchingInfo, setFetchingInfo] = createSignal(false);
  const [selectedPages, setSelectedPages] = createSignal([]); // 选中的分P索引数组

  // 获取当前平台配置
  const getCurrentPlatform = () => {
    return VIDEO_PLATFORMS.find(p => p.id === activePlatform());
  };

  /**
   * 当URL改变时，重置视频信息
   */
  createEffect(() => {
    const currentUrl = url();
    if (!currentUrl.trim()) {
      setVideoInfo(null);
      setSelectedPages([]);
    }
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
    setUrl('');
    setEpisodeTitle('');
    setShowAdvanced(false);
    setVideoInfo(null);
    setSelectedPages([]);
  };

  /**
   * 获取视频信息（包括分P列表）
   */
  const handleFetchInfo = async () => {
    const videoUrl = url().trim();
    if (!videoUrl) {
      toast.error('请输入视频地址');
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

      // 默认选中所有分P
      if (result.data.pages && result.data.pages.length > 0) {
        setSelectedPages(result.data.pages.map(p => p.index));
      }

      toast.success(`视频信息获取成功：${result.data.pages.length} 个分P`);
    } catch (error) {
      toast.error(error.message);
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
      // 当前全选，则取消全选
      setSelectedPages([]);
    } else {
      // 否则全选
      setSelectedPages(info.pages.map(p => p.index));
    }
  };

  /**
   * 处理添加任务
   */
  const handleAddTask = (e) => {
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
      autoCreatePodcast: false, // 始终为 false，强制选择播客
    };

    // 添加可选参数
    if (episodeTitle().trim()) {
      taskData.episodeTitle = episodeTitle().trim();
    }

    // 添加分P选择参数
    if (info && info.isMultiPage && selectedPages().length > 0) {
      // 将选中的分P索引转换为BBDown格式的字符串
      // 如果全选，使用 "ALL"
      if (selectedPages().length === info.pages.length) {
        taskData.selectPage = 'ALL';
      } else {
        taskData.selectPage = selectedPages().join(',');
      }
    }

    // 添加到任务队列
    const taskId = taskManager.addTask(taskData);

    // 显示成功提示
    const pageInfo = info && info.isMultiPage
      ? ` (${selectedPages().length} 个分P)`
      : '';
    toast.success(`任务已添加到下载队列${pageInfo}`);

    // 清空表单
    setUrl('');
    setEpisodeTitle('');
    setVideoInfo(null);
    setSelectedPages([]);

    // 不清空播客选择，方便连续添加到同一个播客
    // setSelectedPodcast('');

    // 通知父组件刷新播客列表（异步，不阻塞）
    if (props.onTaskAdded) {
      props.onTaskAdded(taskId);
    }
  };

  // 检查是否可以提交
  const canSubmit = () => {
    const info = videoInfo();

    // 基本条件：URL和播客都要选择
    if (!url().trim() || !selectedPodcast()) {
      return false;
    }

    // 如果是多分P视频，至少要选择一个分P
    if (info && info.isMultiPage && selectedPages().length === 0) {
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
          <p>粘贴链接、选择播客即可自动下载音频并推送到目录，进度会同步到右下角任务窗口。</p>
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

      <form onSubmit={handleAddTask} style={{ display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>
        <div class="form-grid">
          <div>
            <div class="field-label">视频链接</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                class="input"
                style={{ flex: 1 }}
                placeholder={getCurrentPlatform().placeholder}
                value={url()}
                onInput={(e) => setUrl(e.target.value)}
              />
              <button
                type="button"
                class="btn btn-soft"
                onClick={handleFetchInfo}
                disabled={!url().trim() || fetchingInfo()}
              >
                <Show when={fetchingInfo()} fallback="获取信息">
                  <div class="spinner" style={{ width: '1rem', height: '1rem', 'margin-right': '0.5rem' }}></div>
                  获取中...
                </Show>
              </button>
            </div>
          </div>
          <div>
            <div class="field-label">目标播客</div>
            <select
              value={selectedPodcast()}
              onChange={(e) => setSelectedPodcast(e.target.value)}
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
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem' }}>
                    <div style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#0c4a6e' }}>
                      选择要下载的分P ({selectedPages().length} / {info().pages.length})
                    </div>
                    <button
                      type="button"
                      class="btn btn-soft btn-sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedPages().length === info().pages.length ? '取消全选' : '全选'}
                    </button>
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
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedPages().includes(page.index)) {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedPages().includes(page.index)) {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }
                        }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPages().includes(page.index)}
                            onChange={() => togglePage(page.index)}
                            style={{
                              width: '1.125rem',
                              height: '1.125rem',
                              cursor: 'pointer',
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
            />
          </div>
        </Show>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '0.75rem', 'padding-top': '0.5rem' }}>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!canSubmit()}
            style={{ flex: 1 }}
          >
            开始下载
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
