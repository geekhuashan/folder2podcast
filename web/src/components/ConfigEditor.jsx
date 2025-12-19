import { createSignal, createResource, Show, For } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import { useToast } from './Toast';

// 帮助提示组件
function Tooltip(props) {
  const [show, setShow] = createSignal(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block', 'margin-left': '0.25rem' }}>
      <span
        style={{
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: '1rem',
          height: '1rem',
          'border-radius': '50%',
          background: '#e5e7eb',
          color: '#6b7280',
          'font-size': '0.75rem',
          cursor: 'help'
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </span>
      <Show when={show()}>
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          'margin-bottom': '0.5rem',
          padding: '0.5rem 0.75rem',
          background: '#1f2937',
          color: 'white',
          'border-radius': '0.375rem',
          'font-size': '0.75rem',
          'white-space': 'nowrap',
          'z-index': 1000,
          'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {props.text}
        </div>
      </Show>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = createSignal('basic'); // basic, advanced

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

  // 当配置加载完成后，填充表单
  const initForm = () => {
    const cfg = config()?.data;
    if (cfg) {
      // Metadata
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
      // Parsing
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
  };

  // 导出配置
  const exportConfig = () => {
    const fullConfig = buildConfig();
    const json = JSON.stringify(fullConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.podcast.dirName}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const importConfig = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (imported.metadata) {
        setTitle(imported.metadata.title || '');
        setDescription(imported.metadata.description || '');
        setAuthor(imported.metadata.author || '');
        setEmail(imported.metadata.email || '');
        setWebsiteUrl(imported.metadata.websiteUrl || '');
        setLanguage(imported.metadata.language || 'zh-cn');
        setCategory(imported.metadata.category || 'Podcast');
        setExplicit(imported.metadata.explicit || false);
      }

      if (imported.parsing) {
        setEpisodeNumberStrategy(imported.parsing.episodeNumberStrategy || 'prefix');
        setUseMTime(imported.parsing.useMTime || false);
      }

      toast.success('配置导入成功！');
    } catch (error) {
      toast.error('导入失败：' + error.message);
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
    // 验证必填字段
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
      <div class="modal" onClick={(e) => e.stopPropagation()} style={{ 'max-width': '800px' }}>
        <div style={{ padding: '1.5rem' }}>
          {/* 标题栏 */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '1.5rem'
          }}>
            <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
              编辑播客配置
            </h2>
            <button
              class="btn"
              style={{
                background: 'transparent',
                color: '#6b7280',
                padding: '0.25rem'
              }}
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>

          <Show
            when={!config.loading}
            fallback={
              <div class="flex items-center gap-2">
                <div class="spinner"></div> 加载中...
              </div>
            }
          >
            {initForm()}

            {/* 标签页导航 */}
            <div style={{
              display: 'flex',
              'border-bottom': '2px solid #e5e7eb',
              'margin-bottom': '1.5rem',
              gap: '1rem'
            }}>
              <button
                class="btn"
                style={{
                  background: 'transparent',
                  color: activeTab() === 'basic' ? '#3b82f6' : '#6b7280',
                  'border-bottom': activeTab() === 'basic' ? '2px solid #3b82f6' : 'none',
                  'border-radius': 0,
                  'margin-bottom': '-2px',
                  'font-weight': activeTab() === 'basic' ? '600' : '400'
                }}
                onClick={() => setActiveTab('basic')}
              >
                基本设置
              </button>
              <button
                class="btn"
                style={{
                  background: 'transparent',
                  color: activeTab() === 'advanced' ? '#3b82f6' : '#6b7280',
                  'border-bottom': activeTab() === 'advanced' ? '2px solid #3b82f6' : 'none',
                  'border-radius': 0,
                  'margin-bottom': '-2px',
                  'font-weight': activeTab() === 'advanced' ? '600' : '400'
                }}
                onClick={() => setActiveTab('advanced')}
              >
                高级设置
              </button>
            </div>

            {/* 标签页内容 */}
            <div style={{ 'max-height': '60vh', 'overflow-y': 'auto', padding: '0.5rem' }}>
              {/* 基本设置标签页 */}
              <Show when={activeTab() === 'basic'}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* 标题 */}
                  <div>
                    <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                      播客标题 <span style={{ color: '#ef4444' }}>*</span>
                      <Tooltip text="显示在播客客户端的播客名称" />
                    </label>
                    <input
                      class="input"
                      type="text"
                      value={title()}
                      onInput={(e) => setTitle(e.target.value)}
                      placeholder="播客标题"
                      required
                    />
                  </div>

                  {/* 描述 */}
                  <div>
                    <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                      播客描述
                      <Tooltip text="简要介绍播客内容，吸引听众订阅" />
                    </label>
                    <textarea
                      class="input"
                      value={description()}
                      onInput={(e) => setDescription(e.target.value)}
                      placeholder="播客描述"
                      rows="4"
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  {/* 解析选项 */}
                  <div style={{
                    background: '#f9fafb',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ 'font-weight': '600', 'margin-bottom': '1rem', 'font-size': '0.875rem' }}>
                      🔧 文件解析规则
                    </h3>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                      {/* 剧集序号提取策略 */}
                      <div>
                        <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                          序号提取策略
                          <Tooltip text="提取剧集序号并自动清理标题（去除序号部分）" />
                        </label>
                        <select
                          class="input"
                          value={episodeNumberStrategy()}
                          onChange={(e) => setEpisodeNumberStrategy(e.target.value)}
                        >
                          <option value="prefix">前缀数字（推荐）- 看前5个字符，如 "01-标题" "[P25]标题" "第25集"</option>
                          <option value="suffix">后缀数字 - 看后5个字符，如 "标题01" "标题-01" "标题 01"</option>
                          <option value="date">日期格式 - 自动识别日期，如 "2024-01-15-标题" "日记20240115"</option>
                          <option value="first">第一个数字 - 取第一个出现的数字（最宽松）</option>
                          <option value="last">最后一个数字 - 取最后一个出现的数字</option>
                          <option value="custom">自定义正则表达式</option>
                        </select>

                        <Show when={episodeNumberStrategy() === 'custom'}>
                          <div style={{ 'margin-top': '0.5rem' }}>
                            <input
                              class="input"
                              type="text"
                              value={customPattern()}
                              onInput={(e) => setCustomPattern(e.target.value)}
                              placeholder="输入正则表达式，如 (\d+)"
                            />
                            <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-top': '0.25rem' }}>
                              使用捕获组 () 提取数字，例如：(\d+) 匹配第一个数字
                            </div>
                          </div>
                        </Show>

                        {/* 策略说明提示框 */}
                        <div style={{
                          'margin-top': '0.75rem',
                          padding: '0.75rem',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          'border-radius': '0.375rem',
                          'font-size': '0.75rem',
                          'line-height': '1.5'
                        }}>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#1e40af' }}>
                            💡 工作原理
                          </div>
                          <div style={{ color: '#1e3a8a' }}>
                            <div style={{ 'margin-bottom': '0.5rem' }}>系统会根据你选择的策略提取序号，并<strong>自动清理</strong>标题中的序号部分：</div>
                            <div>• <strong>提取成功</strong>：显示清理后的标题（如 "01-盗墓笔记.mp3" → "盗墓笔记"）</div>
                            <div>• <strong>提取失败</strong>：保留完整文件名（不会修改原始文件）</div>
                          </div>
                        </div>
                      </div>

                      {/* 发布时间策略 */}
                      <div>
                        <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                          发布时间策略
                          <Tooltip text="决定剧集的发布时间来源" />
                        </label>
                        <label style={{ display: 'flex', 'align-items': 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={useMTime()}
                            onChange={(e) => setUseMTime(e.target.checked)}
                            style={{ 'margin-right': '0.5rem' }}
                          />
                          <span>使用文件修改时间</span>
                          <span style={{ 'margin-left': '0.5rem', color: '#6b7280', 'font-size': '0.75rem' }}>
                            （未勾选则按序号生成时间）
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* 高级设置标签页 */}
              <Show when={activeTab() === 'advanced'}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* 元数据 */}
                  <div style={{
                    background: '#f9fafb',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ 'font-weight': '600', 'margin-bottom': '1rem', 'font-size': '0.875rem' }}>
                      📝 播客元数据
                    </h3>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {/* 作者 */}
                      <div>
                        <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                          作者
                          <Tooltip text="播客制作者或主播名称" />
                        </label>
                        <input
                          class="input"
                          type="text"
                          value={author()}
                          onInput={(e) => setAuthor(e.target.value)}
                          placeholder="作者名称"
                        />
                      </div>

                      {/* 邮箱 */}
                      <div>
                        <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                          邮箱
                          <Tooltip text="用于听众联系和 RSS feed 验证" />
                        </label>
                        <input
                          class="input"
                          type="email"
                          value={email()}
                          onInput={(e) => setEmail(e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>

                      {/* 网站链接 */}
                      <div>
                        <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                          网站链接
                          <Tooltip text="播客相关网站或主页" />
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
                          <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                            语言
                            <Tooltip text="播客内容的主要语言" />
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
                          <label class="text-sm font-bold" style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                            分类
                            <Tooltip text="播客所属的类别" />
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
                          <label class="text-sm font-bold" style={{ display: 'block', 'margin-bottom': '0.5rem' }}>
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
                      <div>
                        <label style={{ display: 'flex', 'align-items': 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={explicit()}
                            onChange={(e) => setExplicit(e.target.checked)}
                            style={{ 'margin-right': '0.5rem' }}
                          />
                          <span>此播客包含敏感内容</span>
                          <Tooltip text="标记播客是否包含敏感或成人内容" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 导入导出 */}
                  <div style={{
                    background: '#f9fafb',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ 'font-weight': '600', 'margin-bottom': '1rem', 'font-size': '0.875rem' }}>
                      📦 导入/导出
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        class="btn"
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          flex: 1
                        }}
                        onClick={exportConfig}
                      >
                        📥 导出配置
                      </button>
                      <label
                        class="btn"
                        style={{
                          background: '#10b981',
                          color: 'white',
                          flex: 1,
                          cursor: 'pointer'
                        }}
                      >
                        📤 导入配置
                        <input
                          type="file"
                          accept=".json"
                          style={{ display: 'none' }}
                          onChange={importConfig}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </Show>
            </div>

            {/* 底部按钮 */}
            <div class="flex gap-2" style={{ 'margin-top': '1.5rem', 'padding-top': '1rem', 'border-top': '1px solid #e5e7eb' }}>
              <button
                class="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saving()}
              >
                <Show when={saving()} fallback="💾 保存配置">
                  <div class="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                  保存中...
                </Show>
              </button>
              <button
                class="btn"
                style={{ flex: 1, background: '#6b7280', color: 'white' }}
                onClick={props.onClose}
                disabled={saving()}
              >
                取消
              </button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
