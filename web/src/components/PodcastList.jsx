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
                    <div class="status-pill">
                      🎧 {podcast.episodeCount} 集
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
    </>
  );
}
