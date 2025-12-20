import { createSignal, createResource, For, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import ConfigEditor from './ConfigEditor';
import AudioPlayer from './AudioPlayer';
import { useToast } from './Toast';

// 复制到剪贴板功能
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
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

export default function FileManager(props) {
  const toast = useToast();
  const [files, { refetch }] = createResource(() => props.podcast.dirName, podcastsAPI.getFiles);
  const [uploading, setUploading] = createSignal(false);
  const [showConfigEditor, setShowConfigEditor] = createSignal(false);
  const [playingAudio, setPlayingAudio] = createSignal(null);
  const [renaming, setRenaming] = createSignal(null);
  const [newFileName, setNewFileName] = createSignal('');
  const [rssCopied, setRssCopied] = createSignal(false);

  // 复制 RSS 链接
  const handleCopyRSS = async () => {
    const rssUrl = `${window.location.origin}/feeds/${encodeURIComponent(props.podcast.dirName)}.xml`;
    const success = await copyToClipboard(rssUrl);
    if (success) {
      setRssCopied(true);
      setTimeout(() => setRssCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  // 上传文件
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await podcastsAPI.uploadFile(props.podcast.dirName, file);
      toast.success('文件上传成功！');
      refetch();
    } catch (error) {
      toast.error(`上传失败: ${error.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 删除文件
  const handleDelete = async (fileName) => {
    if (!confirm(`确定要删除 "${fileName}" 吗？`)) return;

    try {
      await podcastsAPI.deleteFile(props.podcast.dirName, fileName);
      toast.success('文件删除成功！');
      refetch();
    } catch (error) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  // 重命名文件
  const startRename = (fileName) => {
    setRenaming(fileName);
    setNewFileName(fileName);
  };

  const confirmRename = async () => {
    const oldName = renaming();
    const newName = newFileName();

    if (!newName || newName === oldName) {
      setRenaming(null);
      return;
    }

    try {
      await podcastsAPI.renameFile(props.podcast.dirName, oldName, newName);
      toast.success('文件重命名成功！');
      setRenaming(null);
      refetch();
    } catch (error) {
      toast.error(`重命名失败: ${error.message}`);
    }
  };

  // 播放音频
  const handlePlay = (fileName) => {
    const audioUrl = `/audio/${encodeURIComponent(props.podcast.dirName)}/${encodeURIComponent(fileName)}`;
    setPlayingAudio({ fileName, url: audioUrl });
  };

  return (
    <div class="stack-lg">
      <div class="section-header">
        <div>
          <p class="eyebrow">正在管理</p>
          <h2 style={{ margin: 0 }}>{props.podcast.title}</h2>
          <p class="text-muted">目录：{props.podcast.dirName}</p>
        </div>
        <div class="hero-actions">
          <label class="btn btn-primary" style={{ cursor: uploading() ? 'wait' : 'pointer' }}>
            <Show when={uploading()} fallback={<span>📤 上传文件</span>}>
              <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
              正在上传...
            </Show>
            <input
              type="file"
              accept="audio/*,image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading()}
            />
          </label>
          <button class="btn btn-soft" onClick={() => setShowConfigEditor(true)}>
            ⚙️ 编辑配置
          </button>
        </div>
      </div>

      <div class="rss-panel">
        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '1rem', 'align-items': 'center' }}>
          <div style={{ flex: 1, 'min-width': '220px' }}>
            <div class="field-label" style={{ color: 'rgba(255,255,255,0.8)' }}>RSS 订阅地址</div>
            <div class="rss-url">
              {window.location.origin}/feeds/{encodeURIComponent(props.podcast.dirName)}.xml
            </div>
          </div>
          <button class="btn btn-secondary" onClick={handleCopyRSS}>
            {rssCopied() ? '✓ 已复制' : '复制链接'}
          </button>
        </div>
        <p style={{ margin: '0.75rem 0 0', 'font-size': '0.85rem', opacity: 0.85 }}>
          将该链接添加到任意播客客户端即可订阅此目录内容。
        </p>
      </div>

      <Show
        when={!files.loading}
        fallback={<div class="flex items-center gap-2"><div class="spinner"></div> 加载文件中...</div>}
      >
        <div class="file-section">
          <Show when={files()?.data?.audio?.length > 0} fallback={
            <div class="empty-state">
              <p>暂未上传音频文件</p>
              <p class="text-sm">支持拖入 MP3/M4A/FLAC 等常见格式，上传后自动生成 RSS。</p>
            </div>
          }>
            <section class="file-card">
              <div class="section-header" style={{ 'align-items': 'center', 'margin-bottom': '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>🎵 音频文件</h3>
                  <p class="text-muted">{files()?.data?.audio?.length || 0} 个文件</p>
                </div>
              </div>
              <For each={files()?.data?.audio || []}>
                {(fileName) => (
                  <div class={`file-row ${renaming() === fileName ? 'is-editing' : ''}`}>
                    <Show
                      when={renaming() === fileName}
                      fallback={<span class="file-row__name">{fileName}</span>}
                    >
                      <input
                        class="input"
                        value={newFileName()}
                        onInput={(e) => setNewFileName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && confirmRename()}
                      />
                    </Show>
                    <div class="file-actions">
                      <Show
                        when={renaming() === fileName}
                        fallback={
                          <>
                            <button class="btn btn-sm btn-soft" onClick={() => handlePlay(fileName)}>
                              ▶️ 试听
                            </button>
                            <button class="btn btn-sm btn-soft" onClick={() => startRename(fileName)}>
                              ✏️ 重命名
                            </button>
                            <button class="btn btn-sm btn-danger" onClick={() => handleDelete(fileName)}>
                              🗑️ 删除
                            </button>
                          </>
                        }
                      >
                        <button class="btn btn-sm btn-primary" onClick={confirmRename}>
                          ✓ 确认
                        </button>
                        <button class="btn btn-sm btn-soft" onClick={() => setRenaming(null)}>
                          ✕ 取消
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </section>
          </Show>

          <Show when={files()?.data?.images?.length > 0}>
            <section class="file-card">
              <div class="section-header" style={{ 'align-items': 'center', 'margin-bottom': '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>🖼️ 图片文件</h3>
                  <p class="text-muted">{files()?.data?.images?.length || 0} 张</p>
                </div>
              </div>
              <For each={files()?.data?.images || []}>
                {(fileName) => (
                  <div class="file-row">
                    <span class="file-row__name">{fileName}</span>
                    <div class="file-actions">
                      <button class="btn btn-sm btn-danger" onClick={() => handleDelete(fileName)}>
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </section>
          </Show>
        </div>
      </Show>

      <Show when={showConfigEditor()}>
        <ConfigEditor
          podcast={props.podcast}
          onClose={() => setShowConfigEditor(false)}
        />
      </Show>

      <Show when={playingAudio()}>
        <AudioPlayer
          audio={playingAudio()}
          onClose={() => setPlayingAudio(null)}
        />
      </Show>
    </div>
  );
}
