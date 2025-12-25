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
  // ✅ 修复：只调用一次 API，避免重复请求导致并发扫描和数据不一致
  const [episodes, { refetch: refetchEpisodes }] = createResource(() => props.podcast.id, episodesAPI.getEpisodes);

  // 界面状态
  const [showConfigEditor, setShowConfigEditor] = createSignal(false);
  const [showEpisodeEditor, setShowEpisodeEditor] = createSignal(false);
  const [selectedFileName, setSelectedFileName] = createSignal(null);
  const [rssCopied, setRssCopied] = createSignal(false);

  // ⭐ 排序工具状态
  const [selectedStrategy, setSelectedStrategy] = createSignal(props.podcast.episodeNumberStrategy || 'prefix');
  const [isReordering, setIsReordering] = createSignal(false);

  // 上传状态统计
  const uploadStats = createMemo(() => uploadState.summary);

  // 音频文件列表
  const audioFiles = createMemo(() => {
    return episodes()?.data?.map(episode => episode.fileName) || [];
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

      refetchEpisodes();
    } catch (error) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  // 剧集编辑成功回调
  const handleEpisodeSave = () => {
    refetchEpisodes();
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

  // ⭐ 批量重新排序
  const handleReorder = async () => {
    const strategy = selectedStrategy();
    setIsReordering(true);

    try {
      // ⭐ 1. 先调用预览接口，获取将要发生的变化
      const preview = await episodesAPI.reorderPreview(props.podcast.id, strategy);

      setIsReordering(false);

      // ⭐ 2. 展示预览结果，让用户确认
      modal.open('confirm', {
        title: '📊 重新排序后的剧集顺序',
        message: `规则：${getStrategyLabel(strategy)} · 共 ${preview.data.total} 个剧集 · ${preview.data.changed} 个序号改变`,
        details: (
          <div style={{ 'text-align': 'left', 'line-height': '1.8' }}>
            {/* 排序结果列表 - 移除内部滚动条 */}
            <Show when={preview.data.total > 0}>
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#374151' }}>
                  最终排序结果（从新到旧）:
                </div>
                {/* 直接展示列表，不设置 max-height */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  'border-radius': '8px'
                }}>
                  <For each={preview.data.episodes}>
                    {(ep, index) => {
                      // ⭐ 最终排名 = 索引 + 1（这才是真正的发布顺序）
                      const finalRank = index() + 1;
                      return (
                        <div style={{
                          padding: '0.875rem 1.25rem',
                          'border-bottom': index() < preview.data.episodes.length - 1 ? '1px solid #f3f4f6' : 'none',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '1rem',
                          'font-size': '0.875rem',
                          background: ep.changed ? '#fefce8' : 'white'
                        }}>
                          {/* 最终排名徽章 */}
                          <div style={{
                            'min-width': '3rem',
                            height: '2.5rem',
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'center',
                            'border-radius': '6px',
                            background: ep.changed ? '#fbbf24' : '#10b981',
                            color: 'white',
                            'font-weight': '700',
                            'font-size': '1rem'
                          }}>
                            {finalRank}
                          </div>

                          {/* 文件名 */}
                          <div style={{
                            flex: 1,
                            overflow: 'hidden',
                            'text-overflow': 'ellipsis',
                            'white-space': 'nowrap',
                            color: '#111827',
                            'font-weight': ep.changed ? '600' : '400'
                          }} title={ep.fileName}>
                            {ep.fileName}
                          </div>

                          {/* 新标记 */}
                          <Show when={!ep.changed}>
                            <div style={{
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              background: '#d1fae5',
                              color: '#065f46',
                              'font-size': '0.75rem',
                              'font-weight': '600',
                              'white-space': 'nowrap'
                            }}>
                              新 #{finalRank}
                            </div>
                          </Show>

                          {/* 变化标记 */}
                          <Show when={ep.changed}>
                            <div style={{
                              padding: '0.375rem 0.625rem',
                              'border-radius': '4px',
                              background: '#fef3c7',
                              color: '#92400e',
                              'font-size': '0.75rem',
                              'font-weight': '600',
                              'white-space': 'nowrap'
                            }}>
                              新 #{finalRank} (原 #{ep.oldSortOrder})
                            </div>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* 无变化提示 */}
            <Show when={preview.data.changed === 0}>
              <div style={{
                padding: '1.5rem',
                'text-align': 'center',
                background: '#f0fdf4',
                'border-radius': '8px',
                border: '1px solid #86efac',
                'margin-bottom': '1rem'
              }}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>✅</div>
                <div style={{ color: '#16a34a', 'font-weight': '600' }}>
                  所有剧集的序号与当前策略一致，无需重新排序
                </div>
              </div>
            </Show>

            {/* 说明信息 */}
            <div style={{
              padding: '0.875rem 1rem',
              background: '#eff6ff',
              'border-radius': '6px',
              border: '1px solid #bfdbfe',
              'font-size': '0.8125rem',
              color: '#1e40af',
              'line-height': '1.6'
            }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>💡 说明</div>
              <div>• 绿色徽章：不变的剧集，保持原排名</div>
              <div>• 黄色徽章：排名发生改变的剧集</div>
              <div>• 确认后，发布时间会根据新排名自动计算（#1 最新）</div>
            </div>
          </div>
        ),
        confirmText: preview.data.changed > 0 ? '确认应用排序' : '关闭',
        cancelText: preview.data.changed > 0 ? '取消' : undefined,
        danger: false,
        onConfirm: async () => {
          // ⭐ 3. 用户确认后，调用真正的排序接口
          if (preview.data.changed === 0) {
            // 无变化，直接关闭
            return;
          }

          setIsReordering(true);
          try {
            const result = await episodesAPI.reorder(props.podcast.id, strategy);
            toast.success(result.data.message || `已更新 ${result.data.updated} 个剧集的排序`);

            // 刷新列表
            refetchEpisodes();
          } catch (error) {
            toast.error(`重新排序失败: ${error.message}`);
          } finally {
            setIsReordering(false);
          }
        }
      });
    } catch (error) {
      setIsReordering(false);
      toast.error(`预览失败: ${error.message}`);
    }
  };

  // 获取策略的显示名称
  const getStrategyLabel = (strategy) => {
    const labels = {
      'prefix': '前缀数字 (01-标题.mp3)',
      'suffix': '后缀数字 (标题-01.mp3)',
      'first': '第一个数字',
      'last': '最后一个数字',
      'date': '日期格式 (2024-01-15.mp3)',
    };
    return labels[strategy] || strategy;
  };

  return (
    <div style={{ padding: '1.5rem', 'max-width': '1400px', margin: '0 auto' }}>
      {/* 紧凑型头部 */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem',
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'border-radius': '12px',
        color: 'white',
        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h2 style={{ margin: 0, 'font-size': '1.5rem', 'font-weight': '700' }}>{props.podcast.title}</h2>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.9, 'font-size': '0.875rem' }}>
            📁 {props.podcast.dirName} · {audioFiles().length || 0} 个文件
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <label class="btn" style={{
            cursor: uploadStats().uploading > 0 ? 'wait' : 'pointer',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            'backdrop-filter': 'blur(10px)',
            'font-weight': '500'
          }}>
            <Show
              when={uploadStats().uploading > 0}
              fallback={<span>📤 上传</span>}
            >
              <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
              {uploadStats().uploading}/{uploadStats().total}
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
          <button class="btn" onClick={() => setShowConfigEditor(true)} style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            'backdrop-filter': 'blur(10px)',
            'font-weight': '500'
          }}>
            ⚙️ 配置
          </button>
        </div>
      </div>

      {/* 工具栏：RSS + 排序（紧凑单行） */}
      <div style={{
        display: 'grid',
        'grid-template-columns': '1fr auto auto auto',
        gap: '0.75rem',
        'align-items': 'center',
        padding: '1rem 1.5rem',
        background: 'white',
        'border-radius': '8px',
        border: '1px solid #e5e7eb',
        'margin-bottom': '1rem'
      }}>
        {/* RSS 地址（紧凑显示） */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          'min-width': 0  // 允许文本截断
        }}>
          <span style={{
            'font-size': '0.875rem',
            color: '#6b7280',
            'white-space': 'nowrap'
          }}>RSS:</span>
          <code style={{
            flex: 1,
            'font-size': '0.75rem',
            color: '#374151',
            background: '#f3f4f6',
            padding: '0.375rem 0.75rem',
            'border-radius': '6px',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'font-family': 'monospace'
          }}>
            /feeds/{encodeURIComponent(props.podcast.id)}.xml
          </code>
        </div>

        {/* 排序选择器 */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <span style={{
            'font-size': '0.875rem',
            color: '#6b7280',
            'white-space': 'nowrap'
          }}>
            序号提取规则:
          </span>
          <select
            value={selectedStrategy()}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            disabled={isReordering()}
            style={{
              padding: '0.5rem 0.75rem',
              'font-size': '0.875rem',
              border: '1px solid #d1d5db',
              'border-radius': '6px',
              background: 'white',
              color: '#374151',
              cursor: 'pointer',
              'min-width': '180px'
            }}
          >
            <option value="prefix">前缀数字 (01-xxx.mp3)</option>
            <option value="suffix">后缀数字 (xxx-01.mp3)</option>
            <option value="first">第一个数字</option>
            <option value="last">最后一个数字</option>
            <option value="date">日期格式 (2024-01-15)</option>
          </select>
        </div>

        {/* 重新排序按钮 */}
        <button
          onClick={handleReorder}
          disabled={isReordering()}
          style={{
            padding: '0.5rem 1rem',
            'font-size': '0.875rem',
            'font-weight': '500',
            background: '#667eea',
            color: 'white',
            border: 'none',
            'border-radius': '6px',
            cursor: isReordering() ? 'wait' : 'pointer',
            'white-space': 'nowrap',
            opacity: isReordering() ? 0.7 : 1
          }}
        >
          {isReordering() ? '⏳ 重新排序中...' : '🔄 应用并重新排序'}
        </button>

        {/* 复制按钮 */}
        <button
          onClick={handleCopyRSS}
          style={{
            padding: '0.5rem 1rem',
            'font-size': '0.875rem',
            'font-weight': '500',
            background: rssCopied() ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            'border-radius': '6px',
            cursor: 'pointer',
            'white-space': 'nowrap',
            transition: 'background 0.2s'
          }}
        >
          {rssCopied() ? '✓ 已复制' : '📋 复制RSS'}
        </button>
      </div>

      {/* 文件列表 */}
      <Show
        when={!episodes.loading}
        fallback={
          <div style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            padding: '3rem',
            background: 'white',
            'border-radius': '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div class="spinner" style={{ width: '2rem', height: '2rem', 'margin-right': '1rem' }}></div>
            <span style={{ color: '#6b7280' }}>加载文件中...</span>
          </div>
        }
      >
        <Show when={audioFiles().length > 0} fallback={
          <div style={{
            padding: '4rem 2rem',
            'text-align': 'center',
            background: 'white',
            'border-radius': '8px',
            border: '2px dashed #e5e7eb'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>🎵</div>
            <p style={{ 'font-size': '1.125rem', 'font-weight': '600', color: '#374151', 'margin-bottom': '0.5rem' }}>
              暂无音频文件
            </p>
            <p style={{ 'font-size': '0.875rem', color: '#6b7280' }}>
              点击"📤 上传"按钮添加音频文件
            </p>
          </div>
        }>
          {/* 紧凑型表格 */}
          <div style={{
            background: 'white',
            'border-radius': '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            {/* 表头 */}
            <div style={{
              display: 'grid',
              'grid-template-columns': '40px 1fr 60px 60px 60px 60px 120px 100px',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: '#f9fafb',
              'border-bottom': '1px solid #e5e7eb',
              'font-size': '0.75rem',
              'font-weight': '600',
              color: '#6b7280',
              'text-transform': 'uppercase',
              'letter-spacing': '0.05em'
            }}>
              <div></div>
              <div>文件名</div>
              <div style={{ 'text-align': 'center' }}>标题</div>
              <div style={{ 'text-align': 'center' }}>描述</div>
              <div style={{ 'text-align': 'center' }}>封面</div>
              <div style={{ 'text-align': 'center' }}>序号</div>
              <div style={{ 'text-align': 'center' }}>发布时间</div>
              <div style={{ 'text-align': 'center' }}>操作</div>
            </div>

            {/* 表格行 */}
            <For each={audioFiles()}>
              {(fileName) => {
                const episode = episodes()?.data?.find(ep => ep.fileName === fileName);
                const hasCover = !!episode?.imageUrl;
                const hasCustomTitle = !!episode?.title && episode.title !== episode.fileName;
                const hasDescription = !!episode?.description;
                const formattedDate = episode?.pubDate
                  ? new Date(episode.pubDate).toLocaleDateString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit'
                    })
                  : '-';

                return (
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': '40px 1fr 60px 60px 60px 60px 120px 100px',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    'border-bottom': '1px solid #f3f4f6',
                    'align-items': 'center',
                    transition: 'background 0.15s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    {/* 图标 */}
                    <div style={{ 'font-size': '1.5rem' }}>🎵</div>

                    {/* 文件名 */}
                    <div style={{
                      'font-size': '0.875rem',
                      color: '#111827',
                      overflow: 'hidden',
                      'text-overflow': 'ellipsis',
                      'white-space': 'nowrap',
                      'font-weight': '500'
                    }} title={fileName}>
                      {fileName}
                    </div>

                    {/* 标题状态 */}
                    <div style={{ 'text-align': 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '1.25rem',
                        height: '1.25rem',
                        'line-height': '1.25rem',
                        'border-radius': '50%',
                        'font-size': '0.75rem',
                        background: hasCustomTitle ? '#10b981' : '#e5e7eb',
                        color: hasCustomTitle ? 'white' : '#9ca3af'
                      }}>
                        {hasCustomTitle ? '✓' : '-'}
                      </span>
                    </div>

                    {/* 描述状态 */}
                    <div style={{ 'text-align': 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '1.25rem',
                        height: '1.25rem',
                        'line-height': '1.25rem',
                        'border-radius': '50%',
                        'font-size': '0.75rem',
                        background: hasDescription ? '#10b981' : '#e5e7eb',
                        color: hasDescription ? 'white' : '#9ca3af'
                      }}>
                        {hasDescription ? '✓' : '-'}
                      </span>
                    </div>

                    {/* 封面状态 */}
                    <div style={{ 'text-align': 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '1.25rem',
                        height: '1.25rem',
                        'line-height': '1.25rem',
                        'border-radius': '50%',
                        'font-size': '0.75rem',
                        background: hasCover ? '#10b981' : '#e5e7eb',
                        color: hasCover ? 'white' : '#9ca3af'
                      }}>
                        {hasCover ? '✓' : '-'}
                      </span>
                    </div>

                    {/* 序号 */}
                    <div style={{
                      'text-align': 'center',
                      'font-size': '0.875rem',
                      'font-weight': '700',
                      color: episode?.sortOrder ? '#667eea' : '#d1d5db'
                    }}>
                      {episode?.sortOrder || '-'}
                    </div>

                    {/* 发布时间 */}
                    <div style={{
                      'text-align': 'center',
                      'font-size': '0.75rem',
                      color: episode?.pubDate ? '#6b7280' : '#d1d5db'
                    }}>
                      {formattedDate}
                    </div>

                    {/* 操作按钮 */}
                    <div style={{ 'text-align': 'center' }}>
                      <button
                        onClick={() => handleSelectFile(fileName)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          'border-radius': '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#5a67d8';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#667eea';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        ✏️ 编辑
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
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
