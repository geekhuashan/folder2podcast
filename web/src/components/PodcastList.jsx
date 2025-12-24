import { createSignal, createResource, For, Show, createEffect } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import CreatePodcastModal from './CreatePodcastModal';
import { useToast } from './Toast';
import { useModal } from '../contexts/ModalContext';
import { getFullFeedUrl } from '../utils/url';

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
  const modal = useModal();
  const [podcasts, { refetch }] = createResource(podcastsAPI.getAll);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [copiedPodcast, setCopiedPodcast] = createSignal(null);
  const [uploading, setUploading] = createSignal(false);
  let folderInputRef;

  // 高亮动画状态：记录需要高亮显示的播客
  const [highlightedPodcast, setHighlightedPodcast] = createSignal(null);

  /**
   * 暴露 refetch 方法给父组件，并接收需要高亮的播客名称
   */
  createEffect(() => {
    if (props.refetchTrigger) {
      refetch();
      // 如果传入了需要高亮的播客名称
      if (props.highlightPodcast) {
        setHighlightedPodcast(props.highlightPodcast);
        // 3秒后移除高亮
        setTimeout(() => setHighlightedPodcast(null), 3000);
      }
    }
  });

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    refetch(); // 刷新播客列表
  };

  const handleCopyRSS = async (podcast, e) => {
    e.stopPropagation(); // 阻止卡片点击事件
    // ✅ 使用统一的 URL 生成函数
    const rssUrl = getFullFeedUrl(podcast.id);
    const success = await copyToClipboard(rssUrl);
    if (success) {
      setCopiedPodcast(podcast.dirName);
      setTimeout(() => setCopiedPodcast(null), 2000);
    } else {
      toast.error('复制失败,请手动复制');
    }
  };

  const handleDeleteClick = (podcast, e) => {
    e.stopPropagation(); // 阻止卡片点击事件

    modal.open('confirm', {
      title: '确认删除播客',
      message: '此操作将删除播客及其所有文件，且无法恢复',
      confirmText: '确认删除',
      cancelText: '取消',
      danger: true,
      details: (
        <div>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
            {podcast.title}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            目录：{podcast.dirName} · {podcast.episodeCount} 集
          </div>
        </div>
      ),
      onConfirm: async () => {
        try {
          await podcastsAPI.delete(podcast.id);
          toast.success(`播客"${podcast.title}"已删除`);
          refetch(); // 刷新播客列表
        } catch (error) {
          toast.error(`删除失败: ${error.message}`);
        }
      }
    });
  };

  // 处理文件夹上传
  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // 从第一个文件的路径中提取文件夹名称
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    const folderName = pathParts[0];

    if (!folderName) {
      toast.error('无法获取文件夹名称');
      return;
    }

    // 过滤出音频文件
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.wma'];
    const audioFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return audioExtensions.includes(ext);
    });

    if (audioFiles.length === 0) {
      toast.warning('所选文件夹中没有音频文件');
      return;
    }

    try {
      setUploading(true);

      // 1. 使用文件夹名称自动生成播客目录名
      const dirName = folderName
        .toLowerCase()
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      // 2. 创建播客
      toast.info(`正在创建播客"${folderName}"...`);
      await podcastsAPI.create({
        dirName: dirName,
        title: folderName,
        description: `从文件夹"${folderName}"上传的播客`,
      });

      toast.success(`播客创建成功，开始上传 ${audioFiles.length} 个音频文件`);

      // 3. 导入上传管理器
      const { addUploadTask, markTaskUploading, updateTaskProgress, markTaskCompleted, markTaskFailed } =
        await import('../utils/uploadManager');

      // 4. 创建上传任务并开始上传
      for (const file of audioFiles) {
        const taskId = addUploadTask(file, dirName);

        try {
          markTaskUploading(taskId);

          await podcastsAPI.uploadFileWithProgress(
            dirName,
            file,
            (loaded, total, percent) => {
              updateTaskProgress(taskId, percent);
            }
          );

          markTaskCompleted(taskId);
        } catch (error) {
          markTaskFailed(taskId, error.message);
        }
      }

      // 5. 刷新播客列表
      toast.success('所有文件上传完成！');
      refetch();

    } catch (error) {
      toast.error(`创建播客失败: ${error.message}`);
    } finally {
      // 重置 input
      event.target.value = '';
      setUploading(false);
    }
  };

  return (
    <>
      {/* 隐藏的文件夹选择 input */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderUpload}
        accept="audio/*"
      />

      <section class="section-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Podcasts</p>
            <h2>播客列表</h2>
            <p class="text-muted" style={{ 'max-width': '520px' }}>
              <Show when={props.isGuest} fallback="为不同的音频专辑创建独立的目录。点击卡片可进入文件管理，以便上传音频、更新封面或编辑配置。">
                浏览现有播客列表。访客模式下仅支持只读访问。
              </Show>
            </p>
          </div>
          <Show when={!props.isGuest}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                class="btn btn-secondary"
                onClick={() => folderInputRef?.click()}
                disabled={uploading()}
                style={{ cursor: uploading() ? 'wait' : 'pointer' }}
              >
                <Show when={uploading()} fallback="📁 上传文件夹">
                  <div class="spinner" style={{ width: '1rem', height: '1rem', display: 'inline-block', 'margin-right': '0.5rem' }}></div>
                  上传中...
                </Show>
              </button>
              <button
                class="btn btn-secondary"
                onClick={props.onGoToDownload}
                style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                📺 视频下载
              </button>
              <button
                class="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + 创建新播客
              </button>
            </div>
          </Show>
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
                {(podcast) => {
                  // 判断是否需要高亮
                  const isHighlighted = () => highlightedPodcast() === podcast.dirName;

                  return (
                    <article
                      class="podcast-card"
                      onClick={() => props.onSelect(podcast)}
                      style={{
                        // 高亮动画
                        animation: isHighlighted() ? 'highlight-pulse 0.8s ease-in-out 3' : 'none',
                        // 高亮时的边框颜色
                        'border-color': isHighlighted() ? 'var(--primary)' : 'var(--border)',
                        // 平滑过渡
                        transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
                      }}
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
                  );
                }}
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
