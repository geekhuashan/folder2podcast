import { createSignal, createResource, createEffect, Show, For } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import { useToast } from './Toast';

// 语言选项
const LANGUAGE_OPTIONS = [
  { value: 'zh-cn', label: '🇨🇳 中文' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'ko', label: '🇰🇷 한국어' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'fr', label: '🇫🇷 Français' }
];

// 分类选项
const CATEGORY_OPTIONS = [
  'Arts',
  'Business',
  'Comedy',
  'Education',
  'Fiction',
  'Government',
  'Health & Fitness',
  'History',
  'Kids & Family',
  'Leisure',
  'Music',
  'News',
  'Religion & Spirituality',
  'Science',
  'Society & Culture',
  'Sports',
  'Technology',
  'True Crime',
  'TV & Film'
];

/**
 * 播客配置编辑器 - 全新单页设计
 *
 * 采用卡片式布局，视觉层次清晰：
 * 1. 封面区域（视觉焦点）
 * 2. 基本信息（核心内容）
 * 3. 高级设置（次要信息）
 * 4. 统一保存按钮
 */
export default function ConfigEditor(props) {
  const toast = useToast();

  // 获取配置数据
  const [config, { refetch }] = createResource(() => props.podcast.id, podcastsAPI.getConfig);

  // ========== 基本信息字段 ==========
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [author, setAuthor] = createSignal('');

  // ========== 封面状态 ==========
  const [uploading, setUploading] = createSignal(false);
  const [coverImage, setCoverImage] = createSignal(null);

  // ========== 高级设置字段 ==========
  const [email, setEmail] = createSignal('');
  const [websiteUrl, setWebsiteUrl] = createSignal('');
  const [language, setLanguage] = createSignal('zh-cn');
  const [category, setCategory] = createSignal('Podcast');
  const [customCategory, setCustomCategory] = createSignal('');
  const [explicit, setExplicit] = createSignal(false);

  // ========== 保存状态 ==========
  const [saving, setSaving] = createSignal(false);

  // 加载配置数据
  createEffect(() => {
    const cfg = config()?.data;
    if (cfg) {
      // 基本信息
      setTitle(cfg.title || '');
      setDescription(cfg.description || '');
      setAuthor(cfg.author || '');

      // 高级设置
      setEmail(cfg.email || '');
      setWebsiteUrl(cfg.websiteUrl || '');
      setLanguage(cfg.language || 'zh-cn');

      const cat = cfg.category || 'Podcast';
      if (CATEGORY_OPTIONS.includes(cat)) {
        setCategory(cat);
        setCustomCategory('');
      } else {
        setCategory('custom');
        setCustomCategory(cat);
      }

      setExplicit(cfg.explicit || false);

      // 加载封面
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

  // 保存所有配置
  const handleSave = async () => {
    if (!title().trim()) {
      toast.error('播客标题不能为空');
      return;
    }

    setSaving(true);
    try {
      const finalCategory = category() === 'custom' ? customCategory() : category();

      const configData = {
        // 基本信息
        title: title(),
        description: description(),
        author: author(),
        // 高级设置
        email: email(),
        websiteUrl: websiteUrl(),
        language: language(),
        category: finalCategory,
        explicit: explicit(),
      };

      await podcastsAPI.updateConfig(props.podcast.id, configData);
      toast.success('配置保存成功！');
      refetch();
    } catch (error) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div
        class="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          'max-width': '800px',
          'max-height': '90vh',
          display: 'flex',
          'flex-direction': 'column',
          background: '#fafbfc',
          'border-radius': '24px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          'box-shadow': '0 20px 60px rgba(0, 0, 0, 0.12)'
        }}
      >
        {/* ========== 顶部栏 ========== */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '2rem 2.5rem',
          background: 'white',
          'border-bottom': '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              'font-size': '1.75rem',
              'font-weight': '700',
              color: '#111827',
              'line-height': '1.2',
              'letter-spacing': '-0.02em'
            }}>
              播客配置
            </h2>
            <p style={{
              margin: '0.375rem 0 0',
              'font-size': '0.9375rem',
              color: '#6b7280',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {props.podcast.dirName}
            </p>
          </div>
          <button
            style={{
              width: '2.75rem',
              height: '2.75rem',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              border: 'none',
              background: '#f3f4f6',
              'border-radius': '12px',
              color: '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={props.onClose}
            onMouseEnter={(e) => {
              e.target.style.background = '#e5e7eb';
              e.target.style.color = '#111827';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f3f4f6';
              e.target.style.color = '#6b7280';
              e.target.style.transform = 'scale(1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ========== 内容区域 ========== */}
        <Show
          when={!config.loading}
          fallback={
            <div style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '5rem',
              gap: '0.875rem'
            }}>
              <div class="spinner" style={{ width: '1.5rem', height: '1.5rem' }}></div>
              <span style={{ color: '#6b7280', 'font-size': '0.9375rem' }}>加载配置中...</span>
            </div>
          }
        >
          <div style={{
            flex: 1,
            'overflow-y': 'auto',
            padding: '1.5rem 2.5rem 2rem'
          }}>
            {/* ========== 1. 播客封面卡片 ========== */}
            <section style={{
              background: 'white',
              'border-radius': '16px',
              padding: '2rem',
              'margin-bottom': '1.5rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <h3 style={{
                margin: '0 0 1.5rem',
                'font-size': '1.125rem',
                'font-weight': '600',
                color: '#111827',
                display: 'flex',
                'align-items': 'center',
                gap: '0.625rem'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  'border-radius': '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                播客封面
              </h3>

              <Show
                when={coverImage()}
                fallback={
                  <div style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    'justify-content': 'center',
                    padding: '3.5rem 2rem',
                    'border-radius': '12px',
                    border: '2px dashed #d1d5db',
                    background: '#f9fafb',
                    'text-align': 'center'
                  }}>
                    <div style={{
                      width: '5rem',
                      height: '5rem',
                      'border-radius': '16px',
                      background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'margin-bottom': '1.25rem'
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <p style={{ color: '#111827', 'font-weight': '600', 'font-size': '1.0625rem', 'margin-bottom': '0.5rem' }}>
                      暂未上传封面图片
                    </p>
                    <p style={{ color: '#6b7280', 'font-size': '0.875rem', 'margin-bottom': '1.5rem', 'line-height': '1.5' }}>
                      建议使用 1400×1400 像素或更大的正方形图片<br/>支持 JPG、PNG、GIF、WebP 格式，不超过 5MB
                    </p>
                    <label class="btn btn-primary" style={{
                      cursor: uploading() ? 'wait' : 'pointer',
                      padding: '0.75rem 1.75rem',
                      'font-size': '0.9375rem',
                      'font-weight': '600'
                    }}>
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
                  gap: '2rem',
                  'align-items': 'flex-start'
                }}>
                  {/* 封面预览 */}
                  <div style={{
                    width: '180px',
                    height: '180px',
                    'border-radius': '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    'box-shadow': '0 8px 24px rgba(0, 0, 0, 0.12)',
                    'flex-shrink': 0
                  }}>
                    <img
                      src={coverImageUrl()}
                      alt="封面预览"
                      style={{ width: '100%', height: '100%', 'object-fit': 'cover' }}
                    />
                  </div>

                  {/* 封面信息和操作 */}
                  <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>
                    <div>
                      <div style={{
                        'font-size': '0.75rem',
                        color: '#9ca3af',
                        'margin-bottom': '0.375rem',
                        'text-transform': 'uppercase',
                        'letter-spacing': '0.05em',
                        'font-weight': '600'
                      }}>
                        当前文件
                      </div>
                      <div style={{
                        'font-size': '1rem',
                        'font-weight': '500',
                        color: '#111827',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.5rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                          <polyline points="13 2 13 9 20 9"/>
                        </svg>
                        {coverImage()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', 'flex-wrap': 'wrap' }}>
                      <label class="btn btn-soft" style={{
                        cursor: uploading() ? 'wait' : 'pointer',
                        'font-weight': '500'
                      }}>
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
                        style={{
                          color: '#ef4444',
                          'font-weight': '500'
                        }}
                        onClick={handleDeleteCover}
                        disabled={uploading()}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#fee2e2';
                          e.target.style.color = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#f3f4f6';
                          e.target.style.color = '#ef4444';
                        }}
                      >
                        删除封面
                      </button>
                    </div>

                    <div style={{
                      'font-size': '0.8125rem',
                      color: '#1e40af',
                      padding: '0.875rem 1.125rem',
                      background: '#eff6ff',
                      'border-radius': '10px',
                      border: '1px solid #dbeafe',
                      'line-height': '1.5'
                    }}>
                      💡 建议尺寸 1400×1400 像素或更大，不超过 5MB
                    </div>
                  </div>
                </div>
              </Show>
            </section>

            {/* ========== 2. 基本信息卡片 ========== */}
            <section style={{
              background: 'white',
              'border-radius': '16px',
              padding: '2rem',
              'margin-bottom': '1.5rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <h3 style={{
                margin: '0 0 1.5rem',
                'font-size': '1.125rem',
                'font-weight': '600',
                color: '#111827',
                display: 'flex',
                'align-items': 'center',
                gap: '0.625rem'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  'border-radius': '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                基本信息
              </h3>

              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>
                {/* 播客标题 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '600',
                    color: '#374151',
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
                    style={{
                      'font-size': '0.9375rem',
                      padding: '0.75rem 1rem'
                    }}
                  />
                </div>

                {/* 播客描述 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '600',
                    color: '#374151',
                    'margin-bottom': '0.5rem'
                  }}>
                    播客描述
                  </label>
                  <textarea
                    class="input"
                    value={description()}
                    onInput={(e) => setDescription(e.target.value)}
                    placeholder="简要介绍你的播客内容，让听众了解你的播客..."
                    rows="4"
                    style={{
                      resize: 'vertical',
                      'min-height': '120px',
                      'font-size': '0.9375rem',
                      padding: '0.75rem 1rem',
                      'line-height': '1.6'
                    }}
                  />
                </div>

                {/* 作者 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '600',
                    color: '#374151',
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
                    style={{
                      'font-size': '0.9375rem',
                      padding: '0.75rem 1rem'
                    }}
                  />
                </div>
              </div>
            </section>

            {/* ========== 3. 高级设置卡片 ========== */}
            <section style={{
              background: 'white',
              'border-radius': '16px',
              padding: '2rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <h3 style={{
                margin: '0 0 1.5rem',
                'font-size': '1.125rem',
                'font-weight': '600',
                color: '#111827',
                display: 'flex',
                'align-items': 'center',
                gap: '0.625rem'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  'border-radius': '8px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m-6-6h6m6 0h-6"/>
                  </svg>
                </div>
                高级设置
              </h3>

              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>
                {/* 邮箱和网站 */}
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      color: '#374151',
                      'margin-bottom': '0.5rem'
                    }}>
                      邮箱
                    </label>
                    <input
                      class="input"
                      type="email"
                      value={email()}
                      onInput={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      style={{
                        'font-size': '0.9375rem',
                        padding: '0.75rem 1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      color: '#374151',
                      'margin-bottom': '0.5rem'
                    }}>
                      网站链接
                    </label>
                    <input
                      class="input"
                      type="url"
                      value={websiteUrl()}
                      onInput={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      style={{
                        'font-size': '0.9375rem',
                        padding: '0.75rem 1rem'
                      }}
                    />
                  </div>
                </div>

                {/* 语言和分类 */}
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      color: '#374151',
                      'margin-bottom': '0.5rem'
                    }}>
                      语言
                    </label>
                    <select
                      class="input"
                      value={language()}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{
                        'font-size': '0.9375rem',
                        padding: '0.75rem 1rem'
                      }}
                    >
                      <For each={LANGUAGE_OPTIONS}>
                        {(lang) => <option value={lang.value}>{lang.label}</option>}
                      </For>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      color: '#374151',
                      'margin-bottom': '0.5rem'
                    }}>
                      分类
                    </label>
                    <select
                      class="input"
                      value={category()}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        'font-size': '0.9375rem',
                        padding: '0.75rem 1rem'
                      }}
                    >
                      <For each={CATEGORY_OPTIONS}>
                        {(cat) => <option value={cat}>{cat}</option>}
                      </For>
                      <option value="custom">自定义...</option>
                    </select>
                  </div>
                </div>

                {/* 自定义分类 */}
                <Show when={category() === 'custom'}>
                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      color: '#374151',
                      'margin-bottom': '0.5rem'
                    }}>
                      自定义分类
                    </label>
                    <input
                      class="input"
                      type="text"
                      value={customCategory()}
                      onInput={(e) => setCustomCategory(e.target.value)}
                      placeholder="输入自定义分类"
                      style={{
                        'font-size': '0.9375rem',
                        padding: '0.75rem 1rem'
                      }}
                    />
                  </div>
                </Show>

                {/* 敏感内容 */}
                <label style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.875rem',
                  cursor: 'pointer',
                  padding: '1.125rem',
                  'border-radius': '12px',
                  background: '#fafafa',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fafafa';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
                >
                  <input
                    type="checkbox"
                    checked={explicit()}
                    onChange={(e) => setExplicit(e.target.checked)}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 'font-size': '0.9375rem', 'font-weight': '600', color: '#111827' }}>
                      此播客包含敏感内容
                    </div>
                    <div style={{ 'font-size': '0.8125rem', color: '#6b7280', 'margin-top': '0.25rem' }}>
                      勾选后会在 RSS Feed 中标记为 explicit
                    </div>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* ========== 底部操作栏 ========== */}
          <div style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            padding: '1.5rem 2.5rem',
            'border-top': '1px solid rgba(0, 0, 0, 0.06)',
            background: 'white'
          }}>
            <button
              class="btn btn-soft"
              onClick={props.onClose}
              style={{
                padding: '0.75rem 1.5rem',
                'font-weight': '500'
              }}
            >
              取消
            </button>

            <button
              class="btn btn-primary"
              onClick={handleSave}
              disabled={saving()}
              style={{
                padding: '0.75rem 2rem',
                'font-weight': '600',
                'font-size': '0.9375rem'
              }}
            >
              <Show when={saving()} fallback="保存所有配置">
                <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                保存中...
              </Show>
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
