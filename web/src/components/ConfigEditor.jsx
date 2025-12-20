import { createSignal, createResource, Show, For } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import { useToast } from './Toast';

// 语言选项
const LANGUAGE_OPTIONS = [
  { value: 'zh-cn', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' }
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

export default function ConfigEditor(props) {
  const toast = useToast();
  const [config, { refetch }] = createResource(() => props.podcast.dirName, podcastsAPI.getConfig);
  const [saving, setSaving] = createSignal(false);

  // 折叠状态
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [showParsing, setShowParsing] = createSignal(false);

  // 封面相关状态
  const [uploading, setUploading] = createSignal(false);
  const [coverImage, setCoverImage] = createSignal(null);

  // 表单字段 - Metadata
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [author, setAuthor] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [websiteUrl, setWebsiteUrl] = createSignal('');
  const [language, setLanguage] = createSignal('zh-cn');
  const [category, setCategory] = createSignal('Podcast');
  const [customCategory, setCustomCategory] = createSignal('');
  const [explicit, setExplicit] = createSignal(false);

  // 表单字段 - Parsing
  const [episodeNumberStrategy, setEpisodeNumberStrategy] = createSignal('prefix');
  const [customPattern, setCustomPattern] = createSignal('');
  const [useMTime, setUseMTime] = createSignal(false);

  // 获取封面文件列表
  const loadCoverImage = async () => {
    try {
      const filesData = await podcastsAPI.getFiles(props.podcast.dirName);
      const images = filesData?.data?.images || [];
      const cover = images.find(img => /^cover\.(jpg|jpeg|png|gif|webp)$/i.test(img));
      setCoverImage(cover || null);
    } catch (error) {
      console.error('Failed to load cover image:', error);
    }
  };

  // 当配置加载完成后，填充表单
  const initForm = () => {
    const cfg = config()?.data;
    if (cfg) {
      if (cfg.metadata) {
        setTitle(cfg.metadata.title || '');
        setDescription(cfg.metadata.description || '');
        setAuthor(cfg.metadata.author || '');
        setEmail(cfg.metadata.email || '');
        setWebsiteUrl(cfg.metadata.websiteUrl || '');
        setLanguage(cfg.metadata.language || 'zh-cn');
        const cat = cfg.metadata.category || 'Podcast';
        if (CATEGORY_OPTIONS.includes(cat)) {
          setCategory(cat);
          setCustomCategory('');
        } else {
          setCategory('custom');
          setCustomCategory(cat);
        }
        setExplicit(cfg.metadata.explicit || false);
      }
      if (cfg.parsing) {
        const strategy = cfg.parsing.episodeNumberStrategy;
        if (typeof strategy === 'object' && strategy.pattern) {
          setEpisodeNumberStrategy('custom');
          setCustomPattern(strategy.pattern);
        } else {
          setEpisodeNumberStrategy(strategy || 'prefix');
          setCustomPattern('');
        }
        setUseMTime(cfg.parsing.useMTime || false);
      }
    }
    loadCoverImage();
  };

  // 上传封面图片
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

  // 删除封面图片
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

  // 构建完整配置对象
  const buildConfig = () => {
    const finalCategory = category() === 'custom' ? customCategory() : category();
    let strategy = episodeNumberStrategy();
    if (strategy === 'custom' && customPattern()) {
      strategy = { pattern: customPattern() };
    }

    return {
      metadata: {
        title: title(),
        description: description(),
        author: author(),
        email: email(),
        websiteUrl: websiteUrl(),
        language: language(),
        category: finalCategory,
        explicit: explicit()
      },
      parsing: {
        episodeNumberStrategy: strategy,
        useMTime: useMTime()
      }
    };
  };

  // 保存配置
  const handleSave = async () => {
    if (!title().trim()) {
      toast.error('播客标题不能为空');
      return;
    }

    setSaving(true);
    try {
      const fullConfig = buildConfig();
      await podcastsAPI.updateConfig(props.podcast.dirName, fullConfig);
      toast.success('配置保存成功！');
      props.onClose?.();
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
          'max-width': '680px',
          'max-height': '90vh',
          display: 'flex',
          'flex-direction': 'column',
          background: 'linear-gradient(to bottom, #ffffff, #fafbfc)',
          'border-radius': '20px',
          overflow: 'hidden'
        }}
      >
        {/* 头部 */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '1.75rem 2rem',
          'border-bottom': '1px solid rgba(0, 0, 0, 0.06)',
          background: 'white'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              'font-size': '1.5rem',
              'font-weight': '700',
              color: 'var(--text)',
              'line-height': '1.2'
            }}>
              编辑播客配置
            </h2>
            <p style={{
              margin: '0.25rem 0 0',
              'font-size': '0.875rem',
              color: 'var(--text-muted)'
            }}>
              {props.podcast.dirName}
            </p>
          </div>
          <button
            style={{
              width: '2.5rem',
              height: '2.5rem',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              border: 'none',
              background: 'var(--surface-soft)',
              'border-radius': '10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={props.onClose}
            onMouseEnter={(e) => {
              e.target.style.background = '#e5e7eb';
              e.target.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--surface-soft)';
              e.target.style.color = 'var(--text-muted)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <Show
          when={!config.loading}
          fallback={
            <div style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '4rem',
              gap: '0.75rem'
            }}>
              <div class="spinner"></div>
              <span style={{ color: 'var(--text-muted)' }}>加载配置中...</span>
            </div>
          }
        >
          {initForm()}

          {/* 内容区域 */}
          <div style={{
            flex: 1,
            'overflow-y': 'auto',
            padding: '1.5rem 2rem 2rem',
            display: 'flex',
            'flex-direction': 'column',
            gap: '1.5rem'
          }}>
            {/* 封面卡片 */}
            <div class="card" style={{
              padding: '1.5rem',
              background: 'white',
              'border-radius': '16px',
              border: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <h3 style={{
                margin: '0 0 1rem',
                'font-size': '1rem',
                'font-weight': '600',
                color: 'var(--text)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
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
                      src={`/audio/${encodeURIComponent(props.podcast.dirName)}/${encodeURIComponent(coverImage())}`}
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

            {/* 基本信息卡片 */}
            <div class="card" style={{
              padding: '1.5rem',
              background: 'white',
              'border-radius': '16px',
              border: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <h3 style={{
                margin: '0 0 1.25rem',
                'font-size': '1rem',
                'font-weight': '600',
                color: 'var(--text)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M2 12h20"/>
                </svg>
                基本信息
              </h3>

              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {/* 标题 */}
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

                {/* 描述 */}
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

                {/* 高级设置折叠按钮 */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced())}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    'border-radius': '10px',
                    background: 'var(--surface-soft)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    'font-size': '0.9375rem',
                    'font-weight': '500'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-soft)'}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                    </svg>
                    <span>高级设置</span>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: showAdvanced() ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* 高级设置内容（可折叠） */}
                <Show when={showAdvanced()}>
                  <div style={{
                    display: 'grid',
                    gap: '1.25rem',
                    padding: '1rem',
                    'border-radius': '10px',
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--border)'
                  }}>
                    {/* 作者和邮箱 */}
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
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

                      <div>
                        <label style={{
                          display: 'block',
                          'font-size': '0.875rem',
                          'font-weight': '500',
                          color: 'var(--text)',
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
                        />
                      </div>
                    </div>

                    {/* 网站链接 */}
                    <div>
                      <label style={{
                        display: 'block',
                        'font-size': '0.875rem',
                        'font-weight': '500',
                        color: 'var(--text)',
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
                      />
                    </div>

                    {/* 语言和分类 */}
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          'font-size': '0.875rem',
                          'font-weight': '500',
                          color: 'var(--text)',
                          'margin-bottom': '0.5rem'
                        }}>
                          语言
                        </label>
                        <select
                          class="input"
                          value={language()}
                          onChange={(e) => setLanguage(e.target.value)}
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
                          'font-weight': '500',
                          color: 'var(--text)',
                          'margin-bottom': '0.5rem'
                        }}>
                          分类
                        </label>
                        <select
                          class="input"
                          value={category()}
                          onChange={(e) => setCategory(e.target.value)}
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
                          'font-weight': '500',
                          color: 'var(--text)',
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
                        />
                      </div>
                    </Show>

                    {/* 敏感内容 */}
                    <label style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      padding: '1rem',
                      'border-radius': '10px',
                      background: 'white',
                      border: '1px solid var(--border)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <input
                        type="checkbox"
                        checked={explicit()}
                        onChange={(e) => setExplicit(e.target.checked)}
                        style={{
                          width: '1.125rem',
                          height: '1.125rem',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ 'font-size': '0.9375rem', 'font-weight': '500' }}>
                        此播客包含敏感内容
                      </span>
                    </label>
                  </div>
                </Show>
              </div>
            </div>

            {/* 解析设置卡片（可折叠） */}
            <div class="card" style={{
              padding: '1.5rem',
              background: 'white',
              'border-radius': '16px',
              border: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              {/* 折叠按钮 */}
              <button
                type="button"
                onClick={() => setShowParsing(!showParsing())}
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  width: '100%',
                  padding: '0',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  'margin-bottom': showParsing() ? '1.25rem' : '0'
                }}
              >
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"/>
                    <polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span>文件解析规则（高级）</span>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: showParsing() ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* 解析设置内容（可折叠） */}
              <Show when={showParsing()}>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {/* 序号提取策略 */}
                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '500',
                      color: 'var(--text)',
                      'margin-bottom': '0.5rem'
                    }}>
                      序号提取策略
                    </label>
                    <select
                      class="input"
                      value={episodeNumberStrategy()}
                      onChange={(e) => setEpisodeNumberStrategy(e.target.value)}
                    >
                      <option value="prefix">前缀数字 - 如 "01-标题" "[P25]标题"</option>
                      <option value="suffix">后缀数字 - 如 "标题-01" "标题 01"</option>
                      <option value="date">日期格式 - 如 "2024-01-15-标题"</option>
                      <option value="first">第一个数字</option>
                      <option value="last">最后一个数字</option>
                      <option value="custom">自定义正则表达式</option>
                    </select>

                    <Show when={episodeNumberStrategy() === 'custom'}>
                      <div style={{ 'margin-top': '0.75rem' }}>
                        <input
                          class="input"
                          type="text"
                          value={customPattern()}
                          onInput={(e) => setCustomPattern(e.target.value)}
                          placeholder="输入正则表达式，如 (\d+)"
                        />
                        <div style={{
                          'font-size': '0.8125rem',
                          color: 'var(--text-muted)',
                          'margin-top': '0.5rem'
                        }}>
                          使用捕获组 () 提取数字，例如：(\d+) 匹配第一个数字
                        </div>
                      </div>
                    </Show>

                    <div style={{
                      'margin-top': '0.75rem',
                      padding: '1rem',
                      background: '#eff6ff',
                      'border-radius': '10px',
                      border: '1px solid #dbeafe',
                      'font-size': '0.8125rem',
                      'line-height': '1.6',
                      color: '#1e40af'
                    }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                        💡 工作原理
                      </div>
                      <div>
                        系统会根据策略提取序号并自动清理标题。提取成功后显示清理后的标题（如 "01-盗墓笔记.mp3" → "盗墓笔记"），提取失败则保留完整文件名。
                      </div>
                    </div>
                  </div>

                  {/* 发布时间策略 */}
                  <label style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    padding: '1rem',
                    'border-radius': '10px',
                    background: 'var(--surface-soft)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-soft)'}
                  >
                    <input
                      type="checkbox"
                      checked={useMTime()}
                      onChange={(e) => setUseMTime(e.target.checked)}
                      style={{
                        width: '1.125rem',
                        height: '1.125rem',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 'font-size': '0.9375rem', 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                        使用文件修改时间
                      </div>
                      <div style={{ 'font-size': '0.8125rem', color: 'var(--text-muted)' }}>
                        未勾选则按序号生成发布时间
                      </div>
                    </div>
                  </label>
                </div>
              </Show>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '1.25rem 2rem',
            'border-top': '1px solid rgba(0, 0, 0, 0.06)',
            background: 'white'
          }}>
            <button
              class="btn"
              style={{
                flex: 1,
                background: '#6b7280',
                color: 'white'
              }}
              onClick={props.onClose}
              disabled={saving()}
            >
              取消
            </button>
            <button
              class="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSave}
              disabled={saving()}
            >
              <Show when={saving()} fallback="保存配置">
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
