import { createSignal, createResource, For, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import CreatePodcastModal from './CreatePodcastModal';
import { useToast } from './Toast';

// 复制到剪贴板功能
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};

export default function PodcastList(props) {
  const toast = useToast();
  const [podcasts, { refetch }] = createResource(podcastsAPI.getAll);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [copiedPodcast, setCopiedPodcast] = createSignal(null);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    refetch(); // 刷新播客列表
  };

  const handleCopyRSS = async (podcast, e) => {
    e.stopPropagation(); // 阻止卡片点击事件
    const rssUrl = `${window.location.origin}/feeds/${encodeURIComponent(podcast.dirName)}.xml`;
    const success = await copyToClipboard(rssUrl);
    if (success) {
      setCopiedPodcast(podcast.dirName);
      setTimeout(() => setCopiedPodcast(null), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <h2 style={{
          'font-size': '1.875rem',
          'font-weight': '700'
        }}>
          播客列表
        </h2>
        <button
          class="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + 创建新播客
        </button>
      </div>

      <Show
        when={!podcasts.loading}
        fallback={
          <div class="flex items-center justify-center" style={{ padding: '3rem' }}>
            <div class="spinner"></div>
            <span style={{ 'margin-left': '0.5rem' }}>加载中...</span>
          </div>
        }
      >
        <Show
          when={podcasts()?.data?.length > 0}
          fallback={
            <div class="card" style={{ 'text-align': 'center', padding: '3rem' }}>
              <p class="text-secondary">暂无播客</p>
            </div>
          }
        >
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            <For each={podcasts()?.data || []}>
              {(podcast) => (
                <div
                  class="card"
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    'flex-direction': 'column'
                  }}
                  onClick={() => props.onSelect(podcast)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <h3 style={{
                    'font-size': '1.25rem',
                    'font-weight': '600',
                    'margin-bottom': '0.5rem'
                  }}>
                    {podcast.title}
                  </h3>
                  <p class="text-secondary text-sm" style={{
                    'margin-bottom': '1rem',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    display: '-webkit-box',
                    '-webkit-line-clamp': '2',
                    '-webkit-box-orient': 'vertical',
                    flex: 1
                  }}>
                    {podcast.description}
                  </p>

                  {/* RSS 链接区域 */}
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    'border-radius': '0.375rem',
                    padding: '0.75rem',
                    'margin-bottom': '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'space-between',
                      gap: '0.5rem'
                    }}>
                      <div style={{ flex: 1, 'min-width': 0 }}>
                        <div style={{
                          'font-size': '0.75rem',
                          color: '#6b7280',
                          'margin-bottom': '0.25rem'
                        }}>
                          RSS 订阅地址
                        </div>
                        <div style={{
                          'font-family': 'monospace',
                          'font-size': '0.75rem',
                          color: '#374151',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap'
                        }}>
                          /feeds/{podcast.dirName}.xml
                        </div>
                      </div>
                      <button
                        class="btn btn-primary btn-sm"
                        onClick={(e) => handleCopyRSS(podcast, e)}
                        style={{
                          'flex-shrink': 0,
                          'min-width': '70px'
                        }}
                      >
                        {copiedPodcast() === podcast.dirName ? '✓ 已复制' : '📋 复制'}
                      </button>
                    </div>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-sm text-secondary">
                      {podcast.episodeCount} 集
                    </span>
                    <span class="text-sm" style={{ color: '#3b82f6' }}>
                      管理 →
                    </span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* 创建播客模态框 */}
      <CreatePodcastModal
        show={showCreateModal()}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
