/**
 * 文件管理器 - 主从布局版本
 *
 * 架构：
 * - 左侧（40%）：文件列表，支持选中
 * - 右侧（60%）：剧集详情面板，显示选中文件的详细信息和编辑表单
 *
 * 特性：
 * - 移除所有模态框，采用行内编辑
 * - 点击文件即可在右侧面板查看和编辑
 * - 自动保存（防抖 1 秒）
 * - 响应式设计
 */

import { createSignal, createResource, For, Show, createMemo } from 'solid-js';
import { podcastsAPI, episodesAPI } from '../utils/api';
import ConfigEditor from './ConfigEditor';
import EpisodeDetailsPanel from './EpisodeDetailsPanel';
import { useToast } from './Toast';
import { useModal } from '../contexts/ModalContext';
import {
  addUploadTask,
  updateTaskProgress,
  markTaskCompleted,
  markTaskFailed,
  uploadState
} from '../utils/uploadManager';

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
  const modal = useModal();

  // 资源加载
  const [files, { refetch }] = createResource(() => props.podcast.id, podcastsAPI.getFiles);
  const [episodes, { refetch: refetchEpisodes }] = createResource(() => props.podcast.id, episodesAPI.getEpisodes);

  // 界面状态
  const [showConfigEditor, setShowConfigEditor] = createSignal(false);
  const [selectedFileName, setSelectedFileName] = createSignal(null);
  const [rssCopied, setRssCopied] = createSignal(false);

  // 上传状态统计
  const uploadStats = createMemo(() => uploadState.summary);

  // 音频文件列表
  const audioFiles = createMemo(() => {
    return files()?.data?.map(episode => episode.fileName) || [];
  });

  // 选中的剧集详情
  const selectedEpisode = createMemo(() => {
    const fileName = selectedFileName();
    if (!fileName) return null;

    const episodeData = episodes()?.data?.find(ep => ep.fileName === fileName);
    return episodeData || {
      fileName: fileName,
      title: fileName,
      description: '',
      pubDate: new Date().toISOString(),
      imageUrl: '',
      metadata: null
    };
  });

  // 选中文件的音频 URL
  const selectedAudioUrl = createMemo(() => {
    const fileName = selectedFileName();
    if (!fileName) return null;
    return `/audio/${encodeURIComponent(props.podcast.dirName)}/${encodeURIComponent(fileName)}`;
  });

  // 复制 RSS 链接
  const handleCopyRSS = async () => {
    const rssUrl = `${window.location.origin}/feeds/${encodeURIComponent(props.podcast.id)}.xml`;
    const success = await copyToClipboard(rssUrl);
    if (success) {
      setRssCopied(true);
      setTimeout(() => setRssCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  // 上传文件（支持多文件选择）
  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // 为每个文件创建上传任务
    const taskIds = selectedFiles.map(file =>
      addUploadTask(file, props.podcast.dirName)
    );

    // 依次上传每个文件
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const taskId = taskIds[i];

      try {
        await podcastsAPI.uploadFileWithProgress(
          props.podcast.dirName,
          file,
          (loaded, total, percentage) => {
            updateTaskProgress(taskId, percentage);
          }
        );

        markTaskCompleted(taskId);
      } catch (error) {
        markTaskFailed(taskId, error.message);
        toast.error(`${file.name} 上传失败: ${error.message}`);
      }
    }

    // 刷新列表
    refetch();
    refetchEpisodes();

    // 清空输入框
    e.target.value = '';

    // 显示完成提示
    const successCount = taskIds.length - uploadState.tasks.filter(t =>
      taskIds.includes(t.id) && t.status === 'failed'
    ).length;

    if (successCount === taskIds.length) {
      toast.success(`成功上传 ${successCount} 个文件！`);
    } else if (successCount > 0) {
      toast.success(`成功上传 ${successCount}/${taskIds.length} 个文件`);
    }
  };

  // 删除文件
  const handleDelete = async (fileName) => {
    try {
      await podcastsAPI.deleteFile(props.podcast.dirName, fileName);
      toast.success('文件删除成功！');

      // 如果删除的是当前选中的文件，清除选中状态
      if (selectedFileName() === fileName) {
        setSelectedFileName(null);
      }

      refetch();
      refetchEpisodes();
    } catch (error) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  // 剧集编辑成功回调
  const handleEpisodeSave = () => {
    refetchEpisodes();
    refetch();
  };

  // 选中文件
  const handleSelectFile = (fileName) => {
    setSelectedFileName(fileName);
  };

  return (
    <div class="stack-lg">
      {/* 头部 */}
      <div class="section-header">
        <div>
          <p class="eyebrow">正在管理</p>
          <h2 style={{ margin: 0 }}>{props.podcast.title}</h2>
          <p class="text-muted">目录：{props.podcast.dirName}</p>
        </div>
        <div class="hero-actions">
          <label class="btn btn-primary" style={{ cursor: uploadStats().uploading > 0 ? 'wait' : 'pointer' }}>
            <Show
              when={uploadStats().uploading > 0}
              fallback={<span>📤 上传文件</span>}
            >
              <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
              上传中 ({uploadStats().uploading}/{uploadStats().total})
            </Show>
            <input
              type="file"
              accept="audio/*,image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploadStats().uploading > 0}
            />
          </label>
          <button class="btn btn-soft" onClick={() => setShowConfigEditor(true)}>
            ⚙️ 编辑配置
          </button>
        </div>
      </div>

      {/* RSS 面板 */}
      <div class="rss-panel">
        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '1rem', 'align-items': 'center' }}>
          <div style={{ flex: 1, 'min-width': '220px' }}>
            <div class="field-label" style={{ color: 'rgba(0,0,0,0.6)' }}>RSS 订阅地址</div>
            <div class="rss-url">
              {window.location.origin}/feeds/{encodeURIComponent(props.podcast.id)}.xml
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

      {/* 主从布局 */}
      <Show
        when={!files.loading}
        fallback={<div class="flex items-center gap-2"><div class="spinner"></div> 加载文件中...</div>}
      >
        <Show when={audioFiles().length > 0} fallback={
          <div class="empty-state">
            <p>暂未上传音频文件</p>
            <p class="text-sm">支持拖入 MP3/M4A/FLAC 等常见格式，上传后自动生成 RSS。</p>
          </div>
        }>
          <div class="file-manager-layout">
            {/* 左侧：文件列表 */}
            <div class="file-manager-list">
              <div class="section-header" style={{ 'margin-bottom': '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>🎵 音频文件</h3>
                  <p class="text-muted">{audioFiles().length || 0} 个文件</p>
                </div>
              </div>

              <div class="file-list-container">
                <For each={audioFiles()}>
                  {(fileName) => (
                    <div
                      class={`file-list-item ${selectedFileName() === fileName ? 'selected' : ''}`}
                      onClick={() => handleSelectFile(fileName)}
                    >
                      <div class="file-list-item__icon">🎵</div>
                      <div class="file-list-item__content">
                        <div class="file-list-item__name">{fileName}</div>
                      </div>
                      <Show when={selectedFileName() === fileName}>
                        <div class="file-list-item__indicator">→</div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* 右侧：详情面板 */}
            <div class="file-manager-details">
              <Show
                when={selectedFileName()}
                fallback={
                  <div class="empty-state" style={{ height: '100%', display: 'flex', 'flex-direction': 'column', 'justify-content': 'center' }}>
                    <p style={{ 'font-size': '2rem', margin: '0 0 1rem' }}>👈</p>
                    <p>选择左侧文件以查看详情</p>
                    <p class="text-sm">点击文件名即可查看和编辑剧集信息</p>
                  </div>
                }
              >
                <EpisodeDetailsPanel
                  episode={selectedEpisode()}
                  podcastDir={props.podcast.id}
                  audioUrl={selectedAudioUrl()}
                  onSave={handleEpisodeSave}
                  onDelete={handleDelete}
                />
              </Show>
            </div>
          </div>
        </Show>
      </Show>

      {/* 配置编辑器（仍然使用模态框） */}
      <Show when={showConfigEditor()}>
        <ConfigEditor
          podcast={props.podcast}
          onClose={() => setShowConfigEditor(false)}
        />
      </Show>
    </div>
  );
}
