import { createSignal, Show, onMount } from 'solid-js';
import { episodesAPI } from '../utils/api';
import { useToast } from './Toast';

/**
 * 剧集元数据编辑器组件
 * @param {Object} props
 * @param {boolean} props.show - 是否显示弹窗
 * @param {Function} props.onClose - 关闭弹窗回调
 * @param {Function} props.onSuccess - 保存成功回调
 * @param {string} props.podcastDir - 播客目录名
 * @param {Object} props.episode - 剧集信息
 */
export default function EpisodeEditor(props) {
  const toast = useToast();

  // 表单状态
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [pubDate, setPubDate] = createSignal('');
  const [coverFile, setCoverFile] = createSignal(null);
  const [coverPreview, setCoverPreview] = createSignal('');
  const [hasCover, setHasCover] = createSignal(false);

  // 加载和保存状态
  const [isLoading, setIsLoading] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);

  // 当弹窗打开时，初始化表单数据
  onMount(() => {
    if (props.show && props.episode) {
      // 填充现有元数据
      setTitle(props.episode.title || '');
      setDescription(props.episode.description || '');

      // 处理发布时间
      if (props.episode.pubDate) {
        try {
          // 将 ISO 格式转换为 datetime-local 所需的格式
          const date = new Date(props.episode.pubDate);
          const formattedDate = date.toISOString().slice(0, 16);
          setPubDate(formattedDate);
        } catch (e) {
          console.warn('Invalid pubDate:', props.episode.pubDate);
        }
      }

      // 检查是否有封面
      setHasCover(!!props.episode.imageUrl);
      if (props.episode.imageUrl) {
        setCoverPreview(props.episode.imageUrl);
      }
    }
  });

  // 处理封面文件选择
  const handleCoverChange = (e) => {
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

    setCoverFile(file);

    // 生成预览
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // 删除封面
  const handleDeleteCover = async () => {
    if (!hasCover()) {
      // 如果只是清除新选择的封面
      setCoverFile(null);
      setCoverPreview('');
      return;
    }

    try {
      setIsLoading(true);
      await episodesAPI.deleteCover(props.podcastDir, props.episode.fileName);

      setHasCover(false);
      setCoverFile(null);
      setCoverPreview('');

      toast.success('封面已删除');
    } catch (error) {
      toast.error(`删除封面失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存元数据
  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 准备元数据
      const metadata = {};

      if (title().trim()) metadata.title = title().trim();
      if (description().trim()) metadata.description = description().trim();
      if (pubDate()) {
        // 转换为 ISO 8601 格式
        metadata.pubDate = new Date(pubDate()).toISOString();
      }

      // 如果有新封面，先上传
      if (coverFile()) {
        try {
          const result = await episodesAPI.uploadCover(
            props.podcastDir,
            props.episode.fileName,
            coverFile()
          );

          // 更新元数据中的封面路径
          if (result.data?.fileName) {
            metadata.image = result.data.fileName;
          }
        } catch (error) {
          toast.error(`封面上传失败: ${error.message}`);
          return;
        }
      }

      // 保存元数据
      await episodesAPI.updateMetadata(
        props.podcastDir,
        props.episode.fileName,
        metadata
      );

      toast.success('剧集元数据已更新');

      // 调用成功回调
      if (props.onSuccess) {
        props.onSuccess();
      }

      // 关闭弹窗
      props.onClose();
    } catch (error) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 重置表单
  const handleReset = async () => {
    try {
      setIsLoading(true);

      // 删除元数据
      await episodesAPI.deleteMetadata(props.podcastDir, props.episode.fileName);

      // 重置表单
      setTitle('');
      setDescription('');
      setPubDate('');
      setCoverFile(null);
      setCoverPreview('');

      toast.success('已重置为默认设置');

      if (props.onSuccess) {
        props.onSuccess();
      }

      props.onClose();
    } catch (error) {
      toast.error(`重置失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Show when={props.show}>
      <div class="modal-overlay" onClick={props.onClose}>
        <div
          class="modal modal--large"
          onClick={(e) => e.stopPropagation()}
          style={{ 'max-width': '800px' }}
        >
          {/* 头部 */}
          <div style={{
            padding: '2rem 2rem 1.5rem',
            'border-bottom': '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                'border-radius': 'var(--radius)',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '24px',
                'flex-shrink': 0
              }}>
                🎵
              </div>
              <div style={{ flex: 1, 'min-width': 0 }}>
                <h2 style={{ margin: 0, 'font-size': '1.5rem', 'margin-bottom': '0.5rem' }}>
                  编辑剧集元数据
                </h2>
                <div style={{
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  'font-family': 'monospace',
                  background: 'var(--surface-soft)',
                  padding: '0.5rem 0.75rem',
                  'border-radius': 'var(--radius-sm)',
                  'white-space': 'nowrap',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis'
                }}>
                  📁 {props.episode?.fileName}
                </div>
              </div>
              <button
                class="btn-icon"
                onClick={props.onClose}
                disabled={isSaving()}
                style={{ 'flex-shrink': 0 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* 表单内容 */}
          <div style={{
            padding: '2rem',
            'max-height': '60vh',
            'overflow-y': 'auto'
          }}>
            {/* 提示信息 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              'border-radius': 'var(--radius)',
              padding: '1rem',
              'margin-bottom': '2rem',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <div style={{ 'font-size': '20px', 'flex-shrink': 0 }}>💡</div>
              <div style={{ 'font-size': '0.875rem', 'line-height': '1.6' }}>
                <div style={{ 'font-weight': 600, 'margin-bottom': '0.25rem' }}>
                  设置剧集元数据来优化播客体验
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  自定义标题、描述和封面将覆盖自动提取的信息，在播客客户端中提供更好的展示效果
                </div>
              </div>
            </div>

            {/* 剧集封面 - 放在最上面，更突出 */}
            <div style={{ 'margin-bottom': '2rem' }}>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                'font-weight': 600,
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                <span>剧集封面</span>
                <span style={{
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)',
                  'font-weight': 400,
                  'font-family': 'monospace',
                  background: 'var(--surface-soft)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '3px'
                }}>
                  itunes:image
                </span>
              </label>

              <Show
                when={coverPreview()}
                fallback={
                  <div style={{
                    border: '2px dashed var(--border)',
                    'border-radius': 'var(--radius)',
                    padding: '3rem 2rem',
                    'text-align': 'center',
                    background: 'var(--surface-soft)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 1rem',
                      'border-radius': 'var(--radius)',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'font-size': '32px'
                    }}>
                      🖼️
                    </div>
                    <div style={{ 'font-weight': 500, 'margin-bottom': '0.5rem' }}>
                      点击选择封面图片
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                      支持 JPG、PNG 格式，建议尺寸 1400×1400 或 3000×3000
                    </div>
                    <label
                      class="btn btn-primary"
                      style={{ cursor: 'pointer' }}
                    >
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCoverChange}
                        disabled={isSaving()}
                      />
                    </label>
                  </div>
                }
              >
                <div style={{
                  position: 'relative',
                  'border-radius': 'var(--radius)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-soft)'
                }}>
                  <img
                    src={coverPreview()}
                    alt="封面预览"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      'max-height': '400px',
                      'object-fit': 'contain'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    <label
                      class="btn btn-secondary"
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
                        onChange={handleCoverChange}
                        disabled={isSaving()}
                      />
                    </label>
                    <button
                      class="btn"
                      onClick={handleDeleteCover}
                      disabled={isSaving()}
                      style={{
                        background: 'rgba(220, 38, 38, 0.9)',
                        'backdrop-filter': 'blur(10px)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
                <div style={{
                  'margin-top': '0.75rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  'text-align': 'center'
                }}>
                  在播客客户端中，剧集封面的优先级高于播客封面
                </div>
              </Show>
            </div>

            {/* 分隔线 */}
            <div style={{
              height: '1px',
              background: 'var(--border)',
              margin: '2rem 0'
            }}></div>

            {/* 自定义标题 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                'font-weight': 600,
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                <span>剧集标题</span>
                <span style={{
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)',
                  'font-weight': 400,
                  'font-family': 'monospace',
                  background: 'var(--surface-soft)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '3px'
                }}>
                  title / itunes:title
                </span>
              </label>
              <input
                type="text"
                class="input"
                placeholder="留空则使用从文件名提取的标题"
                value={title()}
                onInput={(e) => setTitle(e.target.value)}
                disabled={isSaving()}
                style={{
                  'font-size': '1rem',
                  padding: '0.75rem 1rem'
                }}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8125rem',
                color: 'var(--text-muted)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.375rem'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>自定义标题将覆盖从文件名自动提取的标题</span>
              </div>
            </div>

            {/* 剧集描述 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                'font-weight': 600,
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                <span>剧集描述</span>
                <span style={{
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)',
                  'font-weight': 400,
                  'font-family': 'monospace',
                  background: 'var(--surface-soft)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '3px'
                }}>
                  description / itunes:summary
                </span>
              </label>
              <textarea
                class="input"
                placeholder="为这一集添加详细描述，帮助听众了解内容..."
                rows="5"
                value={description()}
                onInput={(e) => setDescription(e.target.value)}
                disabled={isSaving()}
                style={{
                  'font-size': '0.9375rem',
                  padding: '0.75rem 1rem',
                  'line-height': '1.6',
                  resize: 'vertical',
                  'min-height': '120px'
                }}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8125rem',
                color: 'var(--text-muted)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.375rem'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>在播客客户端的剧集详情页中显示</span>
              </div>
            </div>

            {/* 发布时间 */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                'font-weight': 600,
                'margin-bottom': '0.75rem',
                'font-size': '0.9375rem'
              }}>
                <span>发布时间</span>
                <span style={{
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)',
                  'font-weight': 400,
                  'font-family': 'monospace',
                  background: 'var(--surface-soft)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '3px'
                }}>
                  pubDate
                </span>
              </label>
              <input
                type="datetime-local"
                class="input"
                value={pubDate()}
                onInput={(e) => setPubDate(e.target.value)}
                disabled={isSaving()}
                style={{
                  'font-size': '0.9375rem',
                  padding: '0.75rem 1rem'
                }}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8125rem',
                color: 'var(--text-muted)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.375rem'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>控制剧集在播客客户端中的排序和显示时间</span>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div style={{
            padding: '1.5rem 2rem',
            'border-top': '1px solid var(--border)',
            background: 'var(--surface-soft)',
            display: 'flex',
            gap: '1rem',
            'align-items': 'center'
          }}>
            <button
              class="btn btn-secondary"
              onClick={handleReset}
              disabled={isSaving() || isLoading()}
              style={{ 'margin-right': 'auto' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              重置为默认
            </button>
            <button
              class="btn btn-secondary"
              onClick={props.onClose}
              disabled={isSaving()}
            >
              取消
            </button>
            <button
              class="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving()}
              style={{ 'min-width': '120px' }}
            >
              {isSaving() ? (
                <>
                  <div class="spinner" style={{ width: '16px', height: '16px', 'margin-right': '0.5rem' }}></div>
                  保存中...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  保存
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
