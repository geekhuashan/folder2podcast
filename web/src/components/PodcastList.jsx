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
  const [podcastToDelete, setPodcastToDelete] = createSignal(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

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

  const handleDeleteClick = (podcast, e) => {
    e.stopPropagation(); // 阻止卡片点击事件
    setPodcastToDelete(podcast);
  };

  const handleConfirmDelete = async () => {
    const podcast = podcastToDelete();
    if (!podcast) return;

    setIsDeleting(true);
    try {
      await podcastsAPI.delete(podcast.dirName);
      toast.success(`播客"${podcast.title}"已删除`);
      setPodcastToDelete(null);
      refetch(); // 刷新播客列表
    } catch (error) {
      toast.error(`删除失败: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setPodcastToDelete(null);
  };

  return (
    <>
      <section class="section-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Podcasts</p>
            <h2>播客列表</h2>
            <p class="text-muted" style={{ 'max-width': '520px' }}>
              为不同的音频专辑创建独立的目录。点击卡片可进入文件管理，以便上传音频、更新封面或编辑配置。
            </p>
          </div>
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
            <div class="flex items-center justify-center" style={{ padding: '2.5rem 0' }}>
              <div class="spinner"></div>
              <span style={{ 'margin-left': '0.5rem' }}>正在获取播客...</span>
            </div>
          }
        >
          <Show
            when={podcasts()?.data?.length > 0}
            fallback={
              <div class="card" style={{ 'text-align': 'center' }}>
                <p class="text-muted" style={{ 'margin-bottom': '0.5rem' }}>暂未创建任何播客</p>
                <p class="text-sm text-secondary">
                  点击右上角按钮立刻创建第一个播客目录。
                </p>
              </div>
            }
          >
            <div class="card-grid">
              <For each={podcasts()?.data || []}>
                {(podcast) => (
                  <article
                    class="podcast-card"
                    onClick={() => props.onSelect(podcast)}
                  >
                    <div class="podcast-card__actions">
                      <div class="status-pill">
                        🎧 {podcast.episodeCount} 集
                      </div>
                      <button
                        class="btn-icon btn-danger"
                        onClick={(e) => handleDeleteClick(podcast, e)}
                        title="删除播客"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                    <h3>{podcast.title}</h3>
                    <p>
                      {podcast.description || '尚未填写描述，点击进入可在配置中完善。'}
                    </p>

                    <div class="podcast-card__rss">
                      <div style={{ flex: 1 }}>
                        <div class="text-sm text-muted" style={{ 'margin-bottom': '0.2rem' }}>
                          RSS 订阅地址
                        </div>
                        <div class="rss-chip">/feeds/{podcast.dirName}.xml</div>
                      </div>
                      <button
                        class="btn btn-soft btn-sm"
                        onClick={(e) => handleCopyRSS(podcast, e)}
                      >
                        {copiedPodcast() === podcast.dirName ? '✓ 已复制' : '复制'}
                      </button>
                    </div>

                    <div class="card-footer">
                      <span>目录：{podcast.dirName}</span>
                      <span style={{ color: 'var(--primary)' }}>管理 →</span>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </section>
      <CreatePodcastModal
        show={showCreateModal()}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* 删除确认对话框 */}
      <Show when={podcastToDelete()}>
        <div class="modal-overlay" onClick={handleCancelDelete}>
          <div class="modal modal--small" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              {/* 头部 */}
              <div style={{ 'margin-bottom': '1.5rem', 'text-align': 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  'border-radius': '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  margin: '0 auto 1rem',
                  'font-size': '24px'
                }}>
                  ⚠
                </div>
                <h2 style={{ 'font-size': '1.25rem', 'font-weight': '700', margin: '0 0 0.5rem' }}>
                  确认删除播客
                </h2>
                <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  此操作将删除播客及其所有文件，且无法恢复
                </p>
              </div>

              {/* 播客信息 */}
              <div style={{
                background: 'var(--surface-soft)',
                padding: '1rem',
                'border-radius': 'var(--radius-sm)',
                'margin-bottom': '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {podcastToDelete()?.title}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  目录：{podcastToDelete()?.dirName} · {podcastToDelete()?.episodeCount} 集
                </div>
              </div>

              {/* 按钮 */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={handleCancelDelete}
                  disabled={isDeleting()}
                  style={{ flex: 1 }}
                >
                  取消
                </button>
                <button
                  type="button"
                  class="btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting()}
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    color: 'white'
                  }}
                >
                  {isDeleting() ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
