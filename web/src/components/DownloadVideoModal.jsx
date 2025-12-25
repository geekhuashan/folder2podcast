/**
 * 下载视频弹窗组件 - 现代化 UI 设计
 *
 * 支持两种使用场景：
 * 1. 全局下载（不传 defaultPodcastId）：显示播客选择器
 * 2. 播客内下载（传 defaultPodcastId）：隐藏播客选择器，直接下载到指定播客
 *
 * Props:
 * - isOpen: boolean - 是否打开弹窗
 * - onClose: () => void - 关闭回调
 * - defaultPodcastId?: string - 默认播客 ID（播客内部触发时传入）
 * - onTaskAdded?: (taskId) => void - 任务添加成功回调
 */

import { createSignal, createResource, createEffect, Show, For } from 'solid-js';
import { useToast } from './Toast';
import { taskManager } from '../utils/taskManager';
import { podcastsAPI } from '../utils/api';

export default function DownloadVideoModal(props) {
  const toast = useToast();

  // ========== 播客列表资源 ==========
  const [podcasts, { refetch: refetchPodcasts }] = createResource(podcastsAPI.getAll);

  // ========== 基础状态 ==========
  const [url, setUrl] = createSignal('');
  const [selectedPodcast, setSelectedPodcast] = createSignal('');

  // ========== 视频信息状态 ==========
  const [videoInfo, setVideoInfo] = createSignal(null);
  const [fetchingInfo, setFetchingInfo] = createSignal(false);
  const [selectedPages, setSelectedPages] = createSignal([]);

  // ========== 提交状态 ==========
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  /**
   * 初始化默认播客选择
   */
  createEffect(() => {
    if (props.defaultPodcastId) {
      setSelectedPodcast(props.defaultPodcastId);
    }
  });

  /**
   * 弹窗打开时重置状态
   */
  createEffect(() => {
    if (props.isOpen) {
      if (!props.defaultPodcastId) {
        setSelectedPodcast('');
      }
      setUrl('');
      setVideoInfo(null);
      setSelectedPages([]);
      setIsSubmitting(false);
    }
  });

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
   * 获取视频信息（包括分P列表）
   */
  const handleFetchInfo = async () => {
    const videoUrl = url().trim();
    if (!videoUrl || videoUrl.length < 10) {
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
    } catch (error) {
      console.error('获取视频信息失败:', error);
    } finally {
      setFetchingInfo(false);
    }
  };

  /**
   * URL 改变时自动获取视频信息（防抖500ms）
   */
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
   * 处理提交下载
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

    if (info && info.isMultiPage && selectedPages().length === 0) {
      toast.error('请至少选择一个分P');
      return;
    }

    const taskData = {
      url: videoUrl,
      podcastName: selectedPodcast(),
      autoCreatePodcast: false,
    };

    if (info && info.isMultiPage && selectedPages().length > 0) {
      if (selectedPages().length === info.pages.length) {
        taskData.selectPage = 'ALL';
      } else {
        taskData.selectPage = selectedPages().join(',');
      }
    }

    try {
      setIsSubmitting(true);
      const taskId = await taskManager.addTask(taskData);
      toast.success('下载任务已添加到任务中心');

      if (props.onTaskAdded) {
        props.onTaskAdded(taskId);
      }

      props.onClose();
    } catch (error) {
      toast.error(error.message || '创建下载任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 检查是否可以提交
   */
  const canSubmit = () => {
    const info = videoInfo();

    if (!url().trim() || !selectedPodcast()) {
      return false;
    }

    if (info && info.isMultiPage && selectedPages().length === 0) {
      return false;
    }

    if (isSubmitting()) {
      return false;
    }

    return true;
  };

  /**
   * 处理点击遮罩层关闭
   */
  const handleOverlayClick = () => {
    if (!fetchingInfo() && !isSubmitting()) {
      props.onClose();
    }
  };

  /**
   * 是否显示播客选择器
   */
  const shouldShowPodcastSelector = () => {
    return !props.defaultPodcastId;
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="modal-overlay"
        onClick={handleOverlayClick}
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          'backdrop-filter': 'blur(8px)',
        }}
      >
        <div
          class="modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: videoInfo()?.isMultiPage ? '700px' : '580px',
            'max-width': '92vw',
            'max-height': '90vh',
            overflow: 'hidden',
            position: 'relative',
            'border-radius': 'var(--radius-lg)',
            'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* 加载遮罩 - 优雅的渐变背景 */}
          <Show when={fetchingInfo()}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
                'z-index': 100,
                'border-radius': 'inherit',
                'backdrop-filter': 'blur(8px)',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #e5e7eb',
                'border-top-color': 'var(--accent)',
                'border-radius': '50%',
                animation: 'spin 0.8s linear infinite',
                'margin-bottom': '1.5rem',
              }}></div>
              <p style={{
                color: 'var(--text)',
                'font-size': '0.9375rem',
                'font-weight': '500',
                'letter-spacing': '-0.01em',
              }}>
                正在获取视频信息...
              </p>
            </div>
          </Show>

          {/* 弹窗内容容器 */}
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            height: '100%',
            'max-height': '90vh',
          }}>
            {/* 弹窗头部 - 渐变背景 */}
            <div style={{
              padding: '1.75rem 2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              'border-radius': 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
              'flex-shrink': 0,
            }}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  'border-radius': '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'font-size': '1.25rem',
                }}>
                  📥
                </div>
                <h2 style={{
                  margin: 0,
                  'font-size': '1.375rem',
                  'font-weight': '600',
                  color: 'white',
                  'letter-spacing': '-0.02em',
                }}>
                  下载视频
                </h2>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                disabled={fetchingInfo() || isSubmitting()}
                style={{
                  width: '36px',
                  height: '36px',
                  'border-radius': '10px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'font-size': '1.25rem',
                  transition: 'all 0.2s',
                  opacity: (fetchingInfo() || isSubmitting()) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!fetchingInfo() && !isSubmitting()) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗内容区域 */}
            <div style={{
              padding: '2rem',
              'overflow-y': 'auto',
              flex: 1,
            }}>
              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '1.5rem'
              }}>
                {/* 视频链接输入 */}
                <div>
                  <label style={{
                    display: 'block',
                    'margin-bottom': '0.625rem',
                    'font-size': '0.875rem',
                    'font-weight': '600',
                    color: 'var(--text)',
                    'letter-spacing': '-0.01em',
                  }}>
                    视频链接
                  </label>
                  <input
                    type="text"
                    class="input"
                    placeholder="BV1qt4y1X7TW 或完整 URL"
                    value={url()}
                    onInput={(e) => setUrl(e.target.value)}
                    disabled={fetchingInfo() || isSubmitting()}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      'border-radius': '12px',
                      border: '2px solid #e5e7eb',
                      'font-size': '0.9375rem',
                      transition: 'all 0.2s',
                      background: 'var(--surface)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* 播客选择器（条件渲染） */}
                <Show when={shouldShowPodcastSelector()}>
                  <div>
                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'space-between',
                      'margin-bottom': '0.625rem',
                    }}>
                      <label style={{
                        'font-size': '0.875rem',
                        'font-weight': '600',
                        color: 'var(--text)',
                        'letter-spacing': '-0.01em',
                      }}>
                        目标播客
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          refetchPodcasts();
                          toast.success('播客列表已刷新');
                        }}
                        disabled={podcasts.loading || fetchingInfo() || isSubmitting()}
                        style={{
                          padding: '0.5rem 0.875rem',
                          'border-radius': '8px',
                          border: 'none',
                          background: 'var(--surface-soft)',
                          color: 'var(--text-muted)',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: (podcasts.loading || fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.375rem',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (!podcasts.loading && !fetchingInfo() && !isSubmitting()) {
                            e.target.style.background = '#e5e7eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'var(--surface-soft)';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="23 4 23 10 17 10"/>
                          <polyline points="1 20 1 14 7 14"/>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        刷新
                      </button>
                    </div>
                    <select
                      class="input"
                      value={selectedPodcast()}
                      onChange={(e) => setSelectedPodcast(e.target.value)}
                      disabled={fetchingInfo() || isSubmitting() || podcasts.loading}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        'border-radius': '12px',
                        border: '2px solid #e5e7eb',
                        'font-size': '0.9375rem',
                        background: 'var(--surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">
                        {podcasts.loading ? '加载中...' : '请选择播客'}
                      </option>
                      <For each={podcasts()?.data || []}>
                        {(podcast) => (
                          <option value={podcast.dirName}>
                            {podcast.title} ({podcast.episodeCount || 0} 集)
                          </option>
                        )}
                      </For>
                    </select>
                  </div>
                </Show>

                {/* 视频信息和分P选择 */}
                <Show when={videoInfo()}>
                  {(info) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      'border-radius': '16px',
                      border: '1px solid #bae6fd',
                      'box-shadow': '0 4px 12px rgba(14, 165, 233, 0.08)',
                    }}>
                      {/* 视频基本信息 */}
                      <div style={{ 'margin-bottom': info().isMultiPage ? '1.25rem' : 0 }}>
                        <div style={{
                          display: 'flex',
                          'align-items': 'flex-start',
                          gap: '0.875rem',
                          'margin-bottom': '0.75rem',
                        }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            'border-radius': '10px',
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'center',
                            'flex-shrink': 0,
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 3h4v4M8 3H4v4"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, 'min-width': 0 }}>
                            <h3 style={{
                              margin: 0,
                              'font-size': '1.0625rem',
                              'font-weight': '600',
                              color: '#0c4a6e',
                              'line-height': '1.4',
                              'letter-spacing': '-0.01em',
                            }}>
                              {info().title}
                            </h3>
                            <Show when={info().author}>
                              <p style={{
                                margin: '0.375rem 0 0',
                                'font-size': '0.875rem',
                                color: '#0369a1',
                                display: 'flex',
                                'align-items': 'center',
                                gap: '0.375rem',
                              }}>
                                <span style={{ opacity: 0.7 }}>UP主:</span>
                                <span style={{ 'font-weight': '500' }}>{info().author}</span>
                              </p>
                            </Show>
                          </div>
                        </div>
                      </div>

                      {/* 分P选择 */}
                      <Show when={info().isMultiPage}>
                        <div style={{
                          padding: '1.25rem',
                          background: 'white',
                          'border-radius': '12px',
                          border: '1px solid rgba(186, 230, 253, 0.5)',
                        }}>
                          <div style={{
                            display: 'flex',
                            'justify-content': 'space-between',
                            'align-items': 'center',
                            'margin-bottom': '1rem',
                            'flex-wrap': 'wrap',
                            gap: '0.75rem',
                          }}>
                            <div style={{
                              'font-size': '0.875rem',
                              'font-weight': '600',
                              color: '#0c4a6e',
                            }}>
                              选择要下载的分P ({selectedPages().length} / {info().pages.length})
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                              <button
                                type="button"
                                onClick={toggleSelectAll}
                                disabled={fetchingInfo() || isSubmitting()}
                                style={{
                                  padding: '0.5rem 0.875rem',
                                  'border-radius': '8px',
                                  border: 'none',
                                  background: selectedPages().length === info().pages.length ? '#dbeafe' : 'var(--surface-soft)',
                                  color: selectedPages().length === info().pages.length ? '#0369a1' : 'var(--text-muted)',
                                  'font-size': '0.8125rem',
                                  'font-weight': '500',
                                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {selectedPages().length === info().pages.length ? '取消全选' : '全选'}
                              </button>
                              <Show when={info().pages.length > 10}>
                                <button
                                  type="button"
                                  onClick={selectFirst10}
                                  disabled={fetchingInfo() || isSubmitting()}
                                  style={{
                                    padding: '0.5rem 0.875rem',
                                    'border-radius': '8px',
                                    border: 'none',
                                    background: 'var(--surface-soft)',
                                    color: 'var(--text-muted)',
                                    'font-size': '0.8125rem',
                                    'font-weight': '500',
                                    cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  前10集
                                </button>
                                <button
                                  type="button"
                                  onClick={selectLast10}
                                  disabled={fetchingInfo() || isSubmitting()}
                                  style={{
                                    padding: '0.5rem 0.875rem',
                                    'border-radius': '8px',
                                    border: 'none',
                                    background: 'var(--surface-soft)',
                                    color: 'var(--text-muted)',
                                    'font-size': '0.8125rem',
                                    'font-weight': '500',
                                    cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  后10集
                                </button>
                              </Show>
                            </div>
                          </div>

                          {/* 分P列表 */}
                          <div style={{
                            display: 'grid',
                            'grid-template-columns': 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '0.625rem',
                            'max-height': '320px',
                            'overflow-y': 'auto',
                            padding: '0.5rem',
                          }}>
                            <For each={info().pages}>
                              {(page) => (
                                <label style={{
                                  display: 'flex',
                                  'align-items': 'center',
                                  gap: '0.75rem',
                                  padding: '0.875rem 1rem',
                                  'border-radius': '10px',
                                  border: '2px solid',
                                  'border-color': selectedPages().includes(page.index) ? '#0ea5e9' : '#e5e7eb',
                                  background: selectedPages().includes(page.index) ? '#f0f9ff' : 'white',
                                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                  opacity: (fetchingInfo() || isSubmitting()) ? 0.6 : 1,
                                  transition: 'all 0.15s ease',
                                  'box-shadow': selectedPages().includes(page.index) ? '0 2px 8px rgba(14, 165, 233, 0.15)' : 'none',
                                }}
                                onMouseEnter={(e) => {
                                  if (!fetchingInfo() && !isSubmitting() && !selectedPages().includes(page.index)) {
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.background = '#f8fafc';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!selectedPages().includes(page.index)) {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.background = 'white';
                                  }
                                }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPages().includes(page.index)}
                                    onChange={() => togglePage(page.index)}
                                    disabled={fetchingInfo() || isSubmitting()}
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                      'flex-shrink': 0,
                                      'accent-color': '#0ea5e9',
                                    }}
                                  />
                                  <div style={{ flex: 1, 'min-width': 0 }}>
                                    <div style={{
                                      'font-size': '0.875rem',
                                      'font-weight': '500',
                                      color: selectedPages().includes(page.index) ? '#0369a1' : 'var(--text)',
                                      overflow: 'hidden',
                                      'text-overflow': 'ellipsis',
                                      'white-space': 'nowrap',
                                      'line-height': '1.4',
                                    }}>
                                      P{page.index}: {page.title}
                                    </div>
                                    <Show when={page.duration}>
                                      <div style={{
                                        'font-size': '0.75rem',
                                        color: '#64748b',
                                        'margin-top': '0.25rem',
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
              </form>
            </div>

            {/* 弹窗底部 - 固定按钮 */}
            <div style={{
              padding: '1.5rem 2rem',
              'border-top': '1px solid #e5e7eb',
              background: 'white',
              'border-radius': '0 0 var(--radius-lg) var(--radius-lg)',
              display: 'flex',
              gap: '0.875rem',
              'flex-shrink': 0,
            }}>
              <button
                type="button"
                onClick={props.onClose}
                disabled={fetchingInfo() || isSubmitting()}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.5rem',
                  'border-radius': '12px',
                  border: 'none',
                  background: 'var(--surface-soft)',
                  color: 'var(--text-muted)',
                  'font-size': '0.9375rem',
                  'font-weight': '600',
                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: (fetchingInfo() || isSubmitting()) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!fetchingInfo() && !isSubmitting()) {
                    e.target.style.background = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--surface-soft)';
                }}
              >
                取消
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!canSubmit()}
                style={{
                  flex: 2,
                  padding: '0.875rem 1.5rem',
                  'border-radius': '12px',
                  border: 'none',
                  background: canSubmit() ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)' : '#e5e7eb',
                  color: canSubmit() ? 'white' : '#9ca3af',
                  'font-size': '0.9375rem',
                  'font-weight': '600',
                  cursor: canSubmit() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  'box-shadow': canSubmit() ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (canSubmit()) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = canSubmit() ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none';
                }}
              >
                {isSubmitting() ? '提交中...' : '添加到下载队列'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 添加旋转动画的样式 */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Show>
  );
}
