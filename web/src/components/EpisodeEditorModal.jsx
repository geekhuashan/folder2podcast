/**
 * 剧集编辑器模态框组件
 *
 * 功能：
 * - 弹窗形式编辑剧集元数据
 * - 显示剧集的详细信息
 * - 提供表单编辑（标题、描述、发布时间）
 * - 支持封面上传和预览
 * - 嵌入音频播放器
 * - 自动保存（防抖 1 秒）
 */

import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { episodesAPI } from '../utils/api';
import { useToast } from './Toast';
import { useModal } from '../contexts/ModalContext';
import InlineAudioPlayer from './InlineAudioPlayer';

export default function EpisodeEditorModal(props) {
  const toast = useToast();
  const modal = useModal();

  // 表单状态
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [pubDate, setPubDate] = createSignal('');
  const [sortOrder, setSortOrder] = createSignal(0);  // ⭐ 排序序号
  const [coverPreview, setCoverPreview] = createSignal('');
  const [hasCover, setHasCover] = createSignal(false);

  // 加载和保存状态
  const [isSaving, setIsSaving] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [isRepublishing, setIsRepublishing] = createSignal(false);  // ⭐ 重新发布状态

  // 自动保存定时器
  let autoSaveTimer = null;

  // 当剧集数据变化时,更新表单
  createEffect(() => {
    if (props.episode) {
      setTitle(props.episode.metadata?.title || props.episode.title || '');
      setDescription(props.episode.metadata?.description || props.episode.description || '');
      setSortOrder(props.episode.sortOrder || 0);  // ⭐ 加载序号

      // 处理发布时间
      if (props.episode.metadata?.pubDate || props.episode.pubDate) {
        try {
          const date = new Date(props.episode.metadata?.pubDate || props.episode.pubDate);
          const formattedDate = date.toISOString().slice(0, 16);
          setPubDate(formattedDate);
        } catch (e) {
          setPubDate('');
        }
      } else {
        setPubDate('');
      }

      // 封面
      setHasCover(!!props.episode.imageUrl);
      setCoverPreview(props.episode.imageUrl || '');
    }
  });

  // 自动保存逻辑（防抖 1 秒）
  const scheduleAutoSave = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(() => {
      handleSave();
    }, 1000);
  };

  // 清理定时器
  onCleanup(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
  });

  // 保存元数据
  const handleSave = async () => {
    if (!props.episode) return;

    try {
      setIsSaving(true);

      // 准备元数据
      const metadata = {};
      const currentTitle = title().trim();
      const currentDesc = description().trim();
      const currentSortOrder = sortOrder();

      if (currentTitle) metadata.title = currentTitle;
      if (currentDesc) metadata.description = currentDesc;
      if (pubDate()) {
        metadata.pubDate = new Date(pubDate()).toISOString();
      }
      if (currentSortOrder > 0) {  // ⭐ 添加 sortOrder
        metadata.sortOrder = currentSortOrder;
      }

      // 保存元数据
      await episodesAPI.updateMetadata(
        props.podcastDir,
        props.episode.fileName,
        metadata
      );

      // 调用成功回调
      if (props.onSave) {
        props.onSave();
      }
    } catch (error) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理封面上传
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片文件不能超过 10MB');
      return;
    }

    try {
      setIsSaving(true);

      // 上传封面
      await episodesAPI.uploadCover(
        props.podcastDir,
        props.episode.fileName,
        file
      );

      // 生成预览
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverPreview(event.target.result);
        setHasCover(true);
      };
      reader.readAsDataURL(file);

      toast.success('封面上传成功');

      // 调用成功回调
      if (props.onSave) {
        props.onSave();
      }
    } catch (error) {
      toast.error(`封面上传失败: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 删除封面
  const handleDeleteCover = async () => {
    if (!hasCover()) return;

    modal.open('confirm', {
      title: '确认删除封面',
      message: '确定要删除这个剧集的封面吗？',
      confirmText: '删除',
      cancelText: '取消',
      danger: true,
      onConfirm: async () => {
        try {
          setIsSaving(true);
          await episodesAPI.deleteCover(props.podcastDir, props.episode.fileName);

          setHasCover(false);
          setCoverPreview('');

          toast.success('封面已删除');

          if (props.onSave) {
            props.onSave();
          }
        } catch (error) {
          toast.error(`删除封面失败: ${error.message}`);
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  // 删除文件
  const handleDeleteFile = () => {
    modal.open('confirm', {
      title: '确认删除文件',
      message: `确定要删除 "${props.episode.fileName}" 吗？此操作无法撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      danger: true,
      onConfirm: async () => {
        if (props.onDelete) {
          setIsDeleting(true);
          try {
            await props.onDelete(props.episode.fileName);
            // 删除成功后关闭模态框
            if (props.onClose) {
              props.onClose();
            }
          } finally {
            setIsDeleting(false);
          }
        }
      }
    });
  };

  // ⭐ 重新发布剧集
  const handleRepublish = () => {
    modal.open('confirm', {
      title: '重新发布剧集',
      message: `确定要重新发布 "${props.episode.fileName}" 吗？\n\n此操作会：\n• 将发布时间更新为当前时间\n• 在播客客户端中排到最前面\n• 让已收听过的用户重新看到"未收听"标记`,
      confirmText: '重新发布',
      cancelText: '取消',
      onConfirm: async () => {
        setIsRepublishing(true);
        try {
          await episodesAPI.republish(props.podcastDir, props.episode.fileName);
          toast.success('剧集已重新发布！将在播客客户端中显示为新剧集');

          // 刷新数据
          if (props.onSave) {
            props.onSave();
          }
        } catch (error) {
          toast.error(`重新发布失败: ${error.message}`);
        } finally {
          setIsRepublishing(false);
        }
      }
    });
  };

  // 处理模态框关闭
  const handleClose = () => {
    // 如果有未保存的更改，立即保存
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      handleSave();
    }
    if (props.onClose) {
      props.onClose();
    }
  };

  return (
    <Show when={props.show}>
      <div class="modal-overlay" onClick={handleClose}>
        <div
          class="modal-content"
          style={{
            'max-width': '900px',
            'max-height': '90vh',
            'overflow-y': 'auto',
            width: '90%'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div class="modal-header">
            <div>
              <h3 style={{ margin: 0 }}>编辑剧集</h3>
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.875rem',
                color: 'var(--text-muted)',
                'font-family': 'monospace',
                background: 'var(--surface-soft)',
                padding: '0.5rem 0.75rem',
                'border-radius': 'var(--radius-sm)',
                display: 'inline-block',
                'max-width': '100%',
                overflow: 'hidden',
                'text-overflow': 'ellipsis',
                'white-space': 'nowrap'
              }}>
                📁 {props.episode?.fileName}
              </div>
            </div>
            <button
              class="btn-icon"
              onClick={handleClose}
              title="关闭"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* 内容区域 */}
          <div class="modal-body" style={{ padding: '1.5rem' }}>
            {/* 音频播放器 */}
            <Show when={props.audioUrl}>
              <InlineAudioPlayer
                audioUrl={props.audioUrl}
                fileName={props.episode?.fileName}
              />
            </Show>

            {/* 封面 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                剧集封面
              </label>

              <Show
                when={coverPreview()}
                fallback={
                  <label
                    style={{
                      display: 'block',
                      border: '2px dashed var(--border)',
                      'border-radius': 'var(--radius-sm)',
                      padding: '2rem',
                      'text-align': 'center',
                      background: 'var(--surface-soft)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{
                      'font-size': '2rem',
                      'margin-bottom': '0.5rem'
                    }}>
                      🖼️
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)',
                      'margin-bottom': '0.75rem'
                    }}>
                      点击上传封面图片
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleCoverUpload}
                      disabled={isSaving()}
                    />
                  </label>
                }
              >
                <div style={{
                  position: 'relative',
                  'border-radius': 'var(--radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}>
                  <img
                    src={coverPreview()}
                    alt="封面预览"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      'max-height': '300px',
                      'object-fit': 'contain',
                      background: 'var(--surface-soft)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    <label
                      class="btn btn-sm btn-secondary"
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(0, 0, 0, 0.7)',
                        'backdrop-filter': 'blur(10px)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      🔄 更换
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCoverUpload}
                        disabled={isSaving()}
                      />
                    </label>
                    <button
                      class="btn btn-sm"
                      onClick={handleDeleteCover}
                      disabled={isSaving()}
                      style={{
                        background: 'rgba(220, 38, 38, 0.9)',
                        'backdrop-filter': 'blur(10px)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </Show>
            </div>

            {/* 分隔线 */}
            <div style={{
              height: '1px',
              background: 'var(--border)',
              margin: '1.5rem 0'
            }}></div>

            {/* 标题 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                剧集标题
              </label>
              <input
                type="text"
                class="input"
                placeholder="留空则使用从文件名提取的标题"
                value={title()}
                onInput={(e) => {
                  setTitle(e.target.value);
                  scheduleAutoSave();
                }}
                disabled={isSaving()}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8125rem',
                color: 'var(--text-muted)'
              }}>
                自定义标题将覆盖从文件名自动提取的标题
              </div>
            </div>

            {/* 描述 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                剧集描述
              </label>
              <textarea
                class="input"
                placeholder="为这一集添加详细描述..."
                rows="5"
                value={description()}
                onInput={(e) => {
                  setDescription(e.target.value);
                  scheduleAutoSave();
                }}
                disabled={isSaving()}
                style={{
                  resize: 'vertical',
                  'min-height': '100px'
                }}
              />
            </div>

            {/* 排序序号 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                排序序号
              </label>
              <input
                type="number"
                class="input"
                min="1"
                placeholder="设置剧集排序序号"
                value={sortOrder()}
                onInput={(e) => {
                  setSortOrder(parseInt(e.target.value) || 0);
                  scheduleAutoSave();
                }}
                disabled={isSaving()}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8125rem',
                color: 'var(--text-muted)'
              }}>
                序号越小越新。序号 1 排在最前面，序号越大越靠后。修改后发布时间会自动重新生成。
              </div>
            </div>

            {/* 发布时间 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                发布时间
              </label>
              <input
                type="datetime-local"
                class="input"
                value={pubDate()}
                onInput={(e) => {
                  setPubDate(e.target.value);
                  scheduleAutoSave();
                }}
                disabled={isSaving()}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8125rem',
                color: 'var(--text-muted)'
              }}>
                控制剧集在播客客户端中的排序和显示时间
              </div>
            </div>

            {/* 保存状态指示 */}
            <Show when={isSaving()}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--accent-soft)',
                'border-radius': 'var(--radius-sm)',
                'margin-bottom': '1.5rem',
                'font-size': '0.875rem',
                color: 'var(--accent-strong)'
              }}>
                <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                正在保存...
              </div>
            </Show>
          </div>

          {/* 底部操作按钮 */}
          <div class="modal-footer" style={{
            display: 'flex',
            gap: '0.75rem',
            'justify-content': 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                class="btn btn-danger"
                onClick={handleDeleteFile}
                disabled={isDeleting() || isSaving() || isRepublishing()}
              >
                {isDeleting() ? (
                  <>
                    <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    删除中...
                  </>
                ) : (
                  '🗑️ 删除文件'
                )}
              </button>
              <button
                class="btn btn-secondary"
                onClick={handleRepublish}
                disabled={isDeleting() || isSaving() || isRepublishing()}
                title="将此剧集重新发布为新剧集，让已收听用户重新看到"
              >
                {isRepublishing() ? (
                  <>
                    <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    重新发布中...
                  </>
                ) : (
                  '🔄 重新发布'
                )}
              </button>
            </div>
            <button
              class="btn btn-primary"
              onClick={handleClose}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
