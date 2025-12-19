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
    <div>
      {/* 标题和操作按钮 */}
      <div class="flex items-center justify-between mb-4">
        <h2 style={{ 'font-size': '1.875rem', 'font-weight': '700' }}>
          {props.podcast.title}
        </h2>
        <div class="flex gap-2">
          <label class="btn btn-primary">
            <Show when={uploading()} fallback="📤 上传文件">
              <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
              上传中...
            </Show>
            <input
              type="file"
              accept="audio/*,image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading()}
            />
          </label>
          <button
            class="btn"
            style={{ background: '#8b5cf6', color: 'white' }}
            onClick={() => setShowConfigEditor(true)}
          >
            ⚙️ 配置
          </button>
        </div>
      </div>

      {/* RSS 订阅区域 - 突出显示 */}
      <div class="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        'margin-bottom': '1.5rem',
        padding: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          gap: '1rem',
          'flex-wrap': 'wrap'
        }}>
          <div style={{ flex: 1, 'min-width': '200px' }}>
            <div style={{
              'font-size': '0.875rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              opacity: 0.9
            }}>
              📡 RSS 订阅地址
            </div>
            <div style={{
              'font-family': 'monospace',
              'font-size': '0.875rem',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 0.75rem',
              'border-radius': '0.375rem',
              overflow: 'hidden',
              'text-overflow': 'ellipsis',
              'white-space': 'nowrap'
            }}>
              {window.location.origin}/feeds/{encodeURIComponent(props.podcast.dirName)}.xml
            </div>
          </div>
          <button
            class="btn"
            style={{
              background: 'white',
              color: '#667eea',
              'font-weight': '600',
              'flex-shrink': 0,
              'min-width': '120px'
            }}
            onClick={handleCopyRSS}
          >
            {rssCopied() ? '✓ 已复制！' : '📋 复制链接'}
          </button>
        </div>
        <div style={{
          'margin-top': '0.75rem',
          'font-size': '0.75rem',
          opacity: 0.9
        }}>
          💡 将此链接复制到播客客户端（如 Apple Podcasts、Pocket Casts 等）即可订阅
        </div>
      </div>

      {/* 文件列表 */}
      <Show
        when={!files.loading}
        fallback={<div class="flex items-center gap-2"><div class="spinner"></div> 加载中...</div>}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* 音频文件 */}
          <Show when={files()?.data?.audio?.length > 0}>
            <div class="card">
              <h3 class="font-bold mb-2">🎵 音频文件 ({files()?.data?.audio?.length || 0})</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <For each={files()?.data?.audio || []}>
                  {(fileName) => (
                    <div class="flex items-center justify-between" style={{
                      padding: '0.75rem',
                      background: '#f9fafb',
                      'border-radius': '0.375rem'
                    }}>
                      <Show
                        when={renaming() === fileName}
                        fallback={<span style={{ flex: 1 }}>{fileName}</span>}
                      >
                        <input
                          class="input"
                          style={{ flex: 1, 'margin-right': '0.5rem' }}
                          value={newFileName()}
                          onInput={(e) => setNewFileName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && confirmRename()}
                        />
                      </Show>
                      <div class="flex gap-2">
                        <Show
                          when={renaming() === fileName}
                          fallback={
                            <>
                              <button
                                class="btn btn-sm"
                                style={{ background: '#10b981', color: 'white' }}
                                onClick={() => handlePlay(fileName)}
                              >
                                ▶️ 播放
                              </button>
                              <button
                                class="btn btn-sm"
                                style={{ background: '#f59e0b', color: 'white' }}
                                onClick={() => startRename(fileName)}
                              >
                                ✏️ 重命名
                              </button>
                              <button
                                class="btn btn-sm btn-danger"
                                onClick={() => handleDelete(fileName)}
                              >
                                🗑️ 删除
                              </button>
                            </>
                          }
                        >
                          <button class="btn btn-sm btn-primary" onClick={confirmRename}>
                            ✓ 确认
                          </button>
                          <button class="btn btn-sm" onClick={() => setRenaming(null)}>
                            ✕ 取消
                          </button>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* 图片文件 */}
          <Show when={files()?.data?.images?.length > 0}>
            <div class="card">
              <h3 class="font-bold mb-2">🖼️ 图片文件 ({files()?.data?.images?.length || 0})</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <For each={files()?.data?.images || []}>
                  {(fileName) => (
                    <div class="flex items-center justify-between" style={{
                      padding: '0.75rem',
                      background: '#f9fafb',
                      'border-radius': '0.375rem'
                    }}>
                      <span style={{ flex: 1 }}>{fileName}</span>
                      <button
                        class="btn btn-sm btn-danger"
                        onClick={() => handleDelete(fileName)}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* 配置编辑器模态框 */}
      <Show when={showConfigEditor()}>
        <ConfigEditor
          podcast={props.podcast}
          onClose={() => setShowConfigEditor(false)}
        />
      </Show>

      {/* 音频播放器 */}
      <Show when={playingAudio()}>
        <AudioPlayer
          audio={playingAudio()}
          onClose={() => setPlayingAudio(null)}
        />
      </Show>
    </div>
  );
}
