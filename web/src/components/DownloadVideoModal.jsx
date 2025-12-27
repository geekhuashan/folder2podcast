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
            width: videoInfo()?.isMultiPage ? '600px' : '500px',
            'max-width': '92vw',
            'max-height': '90vh',
            overflow: 'auto',
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
            {/* 弹窗头部 - 紧凑版 */}
            <div style={{
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              'border-radius': 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
              'flex-shrink': 0,
            }}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span style={{ 'font-size': '1.125rem' }}>📥</span>
                <h2 style={{
                  margin: 0,
                  'font-size': '1rem',
                  'font-weight': '600',
                  color: 'white',
                }}>
                  下载视频
                </h2>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                disabled={fetchingInfo() || isSubmitting()}
                style={{
                  width: '28px',
                  height: '28px',
                  'border-radius': '6px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'font-size': '1rem',
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

            {/* 弹窗内容区域 - 紧凑版 */}
            <div style={{
              padding: '1rem 1.5rem',
              flex: 1,
            }}>
              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '1rem'
              }}>
                {/* 视频链接输入框 - 仅在未读取到视频信息时显示 */}
                <Show when={!videoInfo()}>
                  <div>
                    <label style={{
                      display: 'block',
                      'margin-bottom': '0.5rem',
                      'font-size': '0.8125rem',
                      'font-weight': '600',
                      color: 'var(--text)',
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
                        padding: '0.625rem 0.875rem',
                        'border-radius': '8px',
                        border: '1px solid #e5e7eb',
                        'font-size': '0.875rem',
                        background: 'var(--surface)',
                      }}
                      autoFocus
                    />
                  </div>
                </Show>

                {/* 播客选择器（条件渲染） */}
                <Show when={shouldShowPodcastSelector()}>
                  <div>
                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'space-between',
                      'margin-bottom': '0.5rem',
                    }}>
                      <label style={{
                        'font-size': '0.8125rem',
                        'font-weight': '600',
                        color: 'var(--text)',
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
                          padding: '0.25rem 0.5rem',
                          'border-radius': '4px',
                          border: 'none',
                          background: 'var(--surface-soft)',
                          color: 'var(--text-muted)',
                          'font-size': '0.75rem',
                          cursor: (podcasts.loading || fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
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
                        padding: '0.5rem 0.75rem',
                        'border-radius': '8px',
                        border: '1px solid #e5e7eb',
                        'font-size': '0.875rem',
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
                      padding: '0.75rem 1rem',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      'border-radius': '8px',
                      border: '1px solid #bae6fd',
                    }}>
                      {/* 视频基本信息 - 紧凑版 */}
                      <div style={{ 'margin-bottom': info().isMultiPage ? '0.75rem' : 0 }}>
                        <div style={{
                          display: 'flex',
                          'align-items': 'flex-start',
                          gap: '0.5rem',
                          'margin-bottom': '0.5rem',
                        }}>
                          <span style={{ 'font-size': '1rem', 'flex-shrink': 0 }}>📺</span>
                          <div style={{ flex: 1, 'min-width': 0 }}>
                            <h3 style={{
                              margin: 0,
                              'font-size': '0.875rem',
                              'font-weight': '600',
                              color: '#0c4a6e',
                              'line-height': '1.3',
                            }}>
                              {info().title}
                            </h3>
                            <Show when={info().author}>
                              <p style={{
                                margin: '0.25rem 0 0',
                                'font-size': '0.75rem',
                                color: '#0369a1',
                              }}>
                                UP: {info().author}
                              </p>
                            </Show>
                          </div>
                        </div>
                      </div>

                      {/* 分P选择 - 紧凑版 */}
                      <Show when={info().isMultiPage}>
                        <div style={{
                          padding: '0.75rem',
                          background: 'white',
                          'border-radius': '6px',
                          border: '1px solid rgba(186, 230, 253, 0.5)',
                        }}>
                          <div style={{
                            display: 'flex',
                            'justify-content': 'space-between',
                            'align-items': 'center',
                            'margin-bottom': '0.5rem',
                            'flex-wrap': 'wrap',
                            gap: '0.5rem',
                          }}>
                            <div style={{
                              'font-size': '0.8125rem',
                              'font-weight': '600',
                              color: '#0c4a6e',
                            }}>
                              选择分P ({selectedPages().length}/{info().pages.length})
                            </div>
                            <div style={{ display: 'flex', gap: '0.375rem', 'flex-wrap': 'wrap' }}>
                              <button
                                type="button"
                                onClick={toggleSelectAll}
                                disabled={fetchingInfo() || isSubmitting()}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  'border-radius': '4px',
                                  border: 'none',
                                  background: selectedPages().length === info().pages.length ? '#dbeafe' : '#f1f5f9',
                                  color: selectedPages().length === info().pages.length ? '#0369a1' : '#64748b',
                                  'font-size': '0.75rem',
                                  'font-weight': '500',
                                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {selectedPages().length === info().pages.length ? '取消' : '全选'}
                              </button>
                              <Show when={info().pages.length > 10}>
                                <button
                                  type="button"
                                  onClick={selectFirst10}
                                  disabled={fetchingInfo() || isSubmitting()}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    'border-radius': '4px',
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    'font-size': '0.75rem',
                                    'font-weight': '500',
                                    cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  前10
                                </button>
                                <button
                                  type="button"
                                  onClick={selectLast10}
                                  disabled={fetchingInfo() || isSubmitting()}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    'border-radius': '4px',
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    'font-size': '0.75rem',
                                    'font-weight': '500',
                                    cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  后10
                                </button>
                              </Show>
                            </div>
                          </div>

                          {/* 分P列表 - 紧凑版 */}
                          <div style={{
                            display: 'grid',
                            'grid-template-columns': 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '0.375rem',
                            padding: '0.375rem',
                          }}>
                            <For each={info().pages}>
                              {(page) => (
                                <label style={{
                                  display: 'flex',
                                  'align-items': 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 0.625rem',
                                  'border-radius': '6px',
                                  border: '1px solid',
                                  'border-color': selectedPages().includes(page.index) ? '#0ea5e9' : '#e5e7eb',
                                  background: selectedPages().includes(page.index) ? '#f0f9ff' : 'white',
                                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                  opacity: (fetchingInfo() || isSubmitting()) ? 0.6 : 1,
                                  transition: 'all 0.15s ease',
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
                                      width: '14px',
                                      height: '14px',
                                      cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                                      'flex-shrink': 0,
                                      'accent-color': '#0ea5e9',
                                    }}
                                  />
                                  <div style={{ flex: 1, 'min-width': 0 }}>
                                    <div style={{
                                      'font-size': '0.75rem',
                                      'font-weight': '500',
                                      color: selectedPages().includes(page.index) ? '#0369a1' : 'var(--text)',
                                      overflow: 'hidden',
                                      'text-overflow': 'ellipsis',
                                      'white-space': 'nowrap',
                                      'line-height': '1.3',
                                    }}>
                                      P{page.index}: {page.title}
                                    </div>
                                    <Show when={page.duration}>
                                      <div style={{
                                        'font-size': '0.6875rem',
                                        color: '#64748b',
                                        'margin-top': '0.125rem',
                                      }}>
                                        {formatDuration(page.duration)}
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

            {/* 弹窗底部 - 紧凑版 */}
            <div style={{
              padding: '0.75rem 1.5rem',
              'border-top': '1px solid #e5e7eb',
              background: 'white',
              'border-radius': '0 0 var(--radius-lg) var(--radius-lg)',
              display: 'flex',
              gap: '0.625rem',
              'flex-shrink': 0,
            }}>
              <button
                type="button"
                onClick={props.onClose}
                disabled={fetchingInfo() || isSubmitting()}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  'border-radius': '6px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#64748b',
                  'font-size': '0.8125rem',
                  'font-weight': '600',
                  cursor: (fetchingInfo() || isSubmitting()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: (fetchingInfo() || isSubmitting()) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!fetchingInfo() && !isSubmitting()) {
                    e.target.style.background = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f1f5f9';
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
                  padding: '0.5rem 1rem',
                  'border-radius': '6px',
                  border: 'none',
                  background: canSubmit() ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)' : '#e5e7eb',
                  color: canSubmit() ? 'white' : '#9ca3af',
                  'font-size': '0.8125rem',
                  'font-weight': '600',
                  cursor: canSubmit() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  'box-shadow': canSubmit() ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (canSubmit()) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = canSubmit() ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none';
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
