import { createSignal, createEffect, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import { useToast } from './Toast';
import { getPodcastCoverUrl } from '../utils/url';

/**
 * 播客配置 - 基本信息标签页
 *
 * 包含:
 * - 播客标题 (必填)
 * - 播客描述
 * - 作者名称
 * - 播客封面 (上传/删除)
 */
export default function ConfigBasicInfo(props) {
  const toast = useToast();

  // 表单字段
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [author, setAuthor] = createSignal('');

  // 封面状态
  const [uploading, setUploading] = createSignal(false);
  const [coverImage, setCoverImage] = createSignal(null);

  // 保存状态
  const [saving, setSaving] = createSignal(false);

  // 加载配置数据
  createEffect(() => {
    const cfg = props.config?.data;
    if (cfg) {
      setTitle(cfg.title || '');
      setDescription(cfg.description || '');
      setAuthor(cfg.author || '');
      loadCoverImage();
    }
  });

  // 加载封面图片
  const loadCoverImage = async () => {
    try {
      const filesData = await podcastsAPI.getFiles(props.podcast.id);
      const images = filesData?.data?.images || [];
      const cover = images.find(img => /^cover\.(jpg|jpeg|png|gif|webp)$/i.test(img));
      setCoverImage(cover || null);
    } catch (error) {
      console.error('Failed to load cover image:', error);
    }
  };

  // 生成封面图片 URL
  const coverImageUrl = () => {
    const cover = coverImage();
    if (!cover) return null;
    // ✅ 使用统一的 URL 生成函数
    // 注意: 封面文件名可能是 cover.jpg/png 等,需要使用完整路径
    return `/audio/${encodeURIComponent(props.podcast.dirName)}/${encodeURIComponent(cover)}`;
  };

  // 上传封面
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const coverFileName = `cover.${ext}`;
      const renamedFile = new File([file], coverFileName, { type: file.type });
      await podcastsAPI.uploadFile(props.podcast.dirName, renamedFile);
      toast.success('封面上传成功！');
      setCoverImage(coverFileName);
      e.target.value = '';
    } catch (error) {
      toast.error(`上传失败: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 删除封面
  const handleDeleteCover = async () => {
    if (!coverImage()) return;
    try {
      await podcastsAPI.deleteFile(props.podcast.dirName, coverImage());
      toast.success('封面已删除');
      setCoverImage(null);
    } catch (error) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!title().trim()) {
      toast.error('播客标题不能为空');
      return;
    }

    setSaving(true);
    try {
      const config = {
        title: title(),
        description: description(),
        author: author(),
      };
      await podcastsAPI.updateConfig(props.podcast.id, config);
      toast.success('配置保存成功！');
      props.onRefresh?.();
    } catch (error) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="tab-panel">
      {/* 封面上传区域 */}
      <div style={{
        padding: '1.5rem',
        background: 'white',
        'border-radius': '12px',
        border: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <h4 style={{
          margin: '0 0 1rem',
          'font-size': '0.9375rem',
          'font-weight': '600',
          color: 'var(--text)',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          播客封面
        </h4>

        <Show
          when={coverImage()}
          fallback={
            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '3rem 2rem',
              'border-radius': '12px',
              border: '2px dashed var(--border)',
              background: 'var(--surface-soft)',
              'text-align': 'center'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                'border-radius': '12px',
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'margin-bottom': '1rem'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p style={{ color: 'var(--text)', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                暂未上传封面图片
              </p>
              <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '1.25rem' }}>
                建议使用 1400x1400 像素或更大的正方形图片
              </p>
              <label class="btn btn-primary" style={{ cursor: uploading() ? 'wait' : 'pointer' }}>
                <Show when={uploading()} fallback="上传封面">
                  <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                  上传中...
                </Show>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleCoverUpload}
                  disabled={uploading()}
                />
              </label>
            </div>
          }
        >
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            'align-items': 'flex-start'
          }}>
            <div style={{
              width: '140px',
              height: '140px',
              'border-radius': '12px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.08)',
              'flex-shrink': 0
            }}>
              <img
                src={coverImageUrl()}
                alt="封面预览"
                style={{ width: '100%', height: '100%', 'object-fit': 'cover' }}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
              <div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem', 'text-transform': 'uppercase', 'letter-spacing': '0.05em' }}>
                  当前文件
                </div>
                <div style={{ 'font-size': '0.9375rem', 'font-weight': '500', color: 'var(--text)' }}>
                  {coverImage()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                <label class="btn btn-soft" style={{ cursor: uploading() ? 'wait' : 'pointer' }}>
                  <Show when={uploading()} fallback="更换封面">
                    <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    上传中...
                  </Show>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleCoverUpload}
                    disabled={uploading()}
                  />
                </label>

                <button
                  class="btn btn-soft"
                  style={{ color: '#ef4444' }}
                  onClick={handleDeleteCover}
                  disabled={uploading()}
                  onMouseEnter={(e) => e.target.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--surface-soft)'}
                >
                  删除封面
                </button>
              </div>

              <div style={{
                'font-size': '0.8125rem',
                color: 'var(--text-muted)',
                padding: '0.75rem 1rem',
                background: '#eff6ff',
                'border-radius': '8px',
                border: '1px solid #dbeafe',
                'line-height': '1.5'
              }}>
                💡 建议尺寸 1400x1400 像素或更大，不超过 5MB
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* 基本信息表单 */}
      <div>
        <label style={{
          display: 'block',
          'font-size': '0.875rem',
          'font-weight': '500',
          color: 'var(--text)',
          'margin-bottom': '0.5rem'
        }}>
          播客标题 <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          class="input"
          type="text"
          value={title()}
          onInput={(e) => setTitle(e.target.value)}
          placeholder="为你的播客起个名字"
          required
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          'font-size': '0.875rem',
          'font-weight': '500',
          color: 'var(--text)',
          'margin-bottom': '0.5rem'
        }}>
          播客描述
        </label>
        <textarea
          class="input"
          value={description()}
          onInput={(e) => setDescription(e.target.value)}
          placeholder="简要介绍你的播客内容..."
          rows="4"
          style={{ resize: 'vertical', 'min-height': '100px' }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          'font-size': '0.875rem',
          'font-weight': '500',
          color: 'var(--text)',
          'margin-bottom': '0.5rem'
        }}>
          作者
        </label>
        <input
          class="input"
          type="text"
          value={author()}
          onInput={(e) => setAuthor(e.target.value)}
          placeholder="作者名称"
        />
      </div>

      {/* 保存按钮 */}
      <div style={{
        display: 'flex',
        'justify-content': 'flex-end',
        'padding-top': '1rem',
        'border-top': '1px solid var(--border)'
      }}>
        <button
          class="btn btn-primary"
          onClick={handleSave}
          disabled={saving()}
        >
          <Show when={saving()} fallback="保存配置">
            <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
            保存中...
          </Show>
        </button>
      </div>
    </div>
  );
}
