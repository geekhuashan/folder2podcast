/**
 * 文件管理器 - 列表布局版本
 *
 * 架构：
 * - 文件列表视图：显示所有音频文件
 * - 点击文件打开编辑模态框
 *
 * 特性：
 * - 列表形式展示所有文件
 * - 弹窗方式编辑剧集元数据
 * - 自动保存（防抖 1 秒）
 * - 响应式设计
 */

import { createSignal, createResource, For, Show, createMemo } from 'solid-js';
import { podcastsAPI, episodesAPI } from '../utils/api';
import ConfigEditor from './ConfigEditor';
import EpisodeEditorModal from './EpisodeEditorModal';
import { useToast } from './Toast';
import { useModal } from '../contexts/ModalContext';
import {
  addUploadTask,
  updateTaskProgress,
  markTaskCompleted,
  markTaskFailed,
  uploadState
} from '../utils/uploadManager';
import { getAudioUrl, getFullFeedUrl } from '../utils/url';

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
  const [showEpisodeEditor, setShowEpisodeEditor] = createSignal(false);
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
    // ✅ 使用统一的 URL 生成函数
    return getAudioUrl(props.podcast.dirName, fileName);
  });

  // 复制 RSS 链接
  const handleCopyRSS = async () => {
    // ✅ 使用统一的 URL 生成函数
    const rssUrl = getFullFeedUrl(props.podcast.id);
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

  // 选中文件并打开编辑器
  const handleSelectFile = (fileName) => {
    setSelectedFileName(fileName);
    setShowEpisodeEditor(true);
  };

  // 关闭编辑器
  const handleCloseEditor = () => {
    setShowEpisodeEditor(false);
    setSelectedFileName(null);
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

      {/* 文件列表 */}
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
          <div class="section-card">
            <div class="section-header" style={{ 'margin-bottom': '1rem' }}>
              <div>
                <p class="eyebrow">音频文件</p>
                <h3 style={{ margin: 0 }}>文件列表</h3>
                <p class="text-muted">{audioFiles().length || 0} 个文件</p>
              </div>
            </div>

            {/* 表格样式的文件列表 */}
            <div class="file-table">
              <div class="file-table-header">
                <div class="file-table-cell" style={{ flex: '0 0 50px' }}>类型</div>
                <div class="file-table-cell" style={{ flex: '1', 'min-width': '200px' }}>文件名</div>
                <div class="file-table-cell" style={{ flex: '0 0 80px', 'text-align': 'center' }}>标题</div>
                <div class="file-table-cell" style={{ flex: '0 0 80px', 'text-align': 'center' }}>描述</div>
                <div class="file-table-cell" style={{ flex: '0 0 80px', 'text-align': 'center' }}>封面</div>
                <div class="file-table-cell" style={{ flex: '0 0 100px', 'text-align': 'center' }}>发布时间</div>
                <div class="file-table-cell" style={{ flex: '0 0 100px', 'text-align': 'center' }}>操作</div>
              </div>
              <For each={audioFiles()}>
                {(fileName) => {
                  const episode = episodes()?.data?.find(ep => ep.fileName === fileName);
                  const hasCover = !!episode?.imageUrl;
                  const hasCustomTitle = !!episode?.metadata?.title;
                  const hasDescription = !!episode?.metadata?.description;
                  const hasCustomDate = !!episode?.metadata?.pubDate;

                  return (
                    <div class="file-table-row">
                      <div class="file-table-cell" style={{ flex: '0 0 50px' }}>
                        <div style={{ 'font-size': '1.5rem' }}>🎵</div>
                      </div>
                      <div class="file-table-cell" style={{ flex: '1', 'min-width': '200px' }}>
                        <div class="file-name" title={fileName}>{fileName}</div>
                      </div>
                      <div class="file-table-cell" style={{ flex: '0 0 80px', 'text-align': 'center' }}>
                        <span class={`field-status ${hasCustomTitle ? 'field-status--yes' : 'field-status--no'}`}>
                          {hasCustomTitle ? '✓' : '-'}
                        </span>
                      </div>
                      <div class="file-table-cell" style={{ flex: '0 0 80px', 'text-align': 'center' }}>
                        <span class={`field-status ${hasDescription ? 'field-status--yes' : 'field-status--no'}`}>
                          {hasDescription ? '✓' : '-'}
                        </span>
                      </div>
                      <div class="file-table-cell" style={{ flex: '0 0 80px', 'text-align': 'center' }}>
                        <span class={`field-status ${hasCover ? 'field-status--yes' : 'field-status--no'}`}>
                          {hasCover ? '✓' : '-'}
                        </span>
                      </div>
                      <div class="file-table-cell" style={{ flex: '0 0 100px', 'text-align': 'center' }}>
                        <span class={`field-status ${hasCustomDate ? 'field-status--yes' : 'field-status--no'}`}>
                          {hasCustomDate ? '✓' : '-'}
                        </span>
                      </div>
                      <div class="file-table-cell" style={{ flex: '0 0 100px', 'text-align': 'center' }}>
                        <button
                          class="btn btn-sm btn-primary"
                          onClick={() => handleSelectFile(fileName)}
                        >
                          ✏️ 编辑
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </Show>

      {/* 剧集编辑模态框 */}
      <EpisodeEditorModal
        show={showEpisodeEditor()}
        episode={selectedEpisode()}
        podcastDir={props.podcast.id}
        audioUrl={selectedAudioUrl()}
        onSave={handleEpisodeSave}
        onDelete={handleDelete}
        onClose={handleCloseEditor}
      />

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
