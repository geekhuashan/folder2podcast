import { createSignal, createEffect, Show, For } from 'solid-js';
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

/**
 * 播客配置 - 高级设置标签页
 *
 * 包含:
 * - 邮箱
 * - 网站链接
 * - 语言
 * - 分类 (预设 + 自定义)
 * - 敏感内容标记
 */
export default function ConfigAdvanced(props) {
  const toast = useToast();

  // 表单字段
  const [email, setEmail] = createSignal('');
  const [websiteUrl, setWebsiteUrl] = createSignal('');
  const [language, setLanguage] = createSignal('zh-cn');
  const [category, setCategory] = createSignal('Podcast');
  const [customCategory, setCustomCategory] = createSignal('');
  const [explicit, setExplicit] = createSignal(false);

  // 保存状态
  const [saving, setSaving] = createSignal(false);

  // 加载配置数据
  createEffect(() => {
    const cfg = props.config?.data;
    if (cfg) {
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
    }
  });

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      const finalCategory = category() === 'custom' ? customCategory() : category();

      // 注意：后端当前可能不支持这些字段，需要后端 API 更新
      const config = {
        email: email(),
        websiteUrl: websiteUrl(),
        language: language(),
        category: finalCategory,
        explicit: explicit(),
      };

      // TODO: 等待后端支持高级配置更新
      // await podcastsAPI.updateConfig(props.podcast.id, config);
      console.log('[ConfigAdvanced] 保存配置:', config);
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
      {/* 邮箱和网站 */}
      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
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

      {/* 提示信息 */}
      <div style={{
        padding: '1rem',
        background: '#fffbeb',
        'border-radius': '10px',
        border: '1px solid #fef3c7',
        'font-size': '0.8125rem',
        'line-height': '1.6',
        color: '#92400e'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          ⚠️ 注意
        </div>
        <div>
          高级设置需要后端 API 支持。当前保存的配置可能不会立即生效,请等待后端更新。
        </div>
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
