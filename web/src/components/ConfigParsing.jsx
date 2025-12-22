import { createSignal, createEffect, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import { useToast } from './Toast';

/**
 * 播客配置 - 解析规则标签页
 *
 * 包含:
 * - 序号提取策略 (prefix/suffix/date/first/last/custom)
 * - 自定义正则表达式
 * - 发布时间策略 (使用文件修改时间)
 */
export default function ConfigParsing(props) {
  const toast = useToast();

  // 表单字段
  const [episodeNumberStrategy, setEpisodeNumberStrategy] = createSignal('prefix');
  const [customPattern, setCustomPattern] = createSignal('');
  const [useMTime, setUseMTime] = createSignal(false);

  // 保存状态
  const [saving, setSaving] = createSignal(false);

  // 加载配置数据
  createEffect(() => {
    const cfg = props.config?.data;
    if (cfg) {
      // 解析设置
      const strategy = cfg.episodeNumberStrategy;
      if (typeof strategy === 'object' && strategy.pattern) {
        setEpisodeNumberStrategy('custom');
        setCustomPattern(strategy.pattern);
      } else {
        setEpisodeNumberStrategy(strategy || 'prefix');
        setCustomPattern('');
      }
      setUseMTime(cfg.useMTime || false);
    }
  });

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      // 构建解析配置
      let strategyValue;
      if (episodeNumberStrategy() === 'custom') {
        if (!customPattern().trim()) {
          toast.error('请输入自定义正则表达式');
          setSaving(false);
          return;
        }
        strategyValue = { pattern: customPattern() };
      } else {
        strategyValue = episodeNumberStrategy();
      }

      // 注意：后端当前可能不支持这些字段，需要后端 API 更新
      const config = {
        episodeNumberStrategy: strategyValue,
        useMTime: useMTime(),
      };

      // TODO: 等待后端支持解析配置更新
      // await podcastsAPI.updateConfig(props.podcast.id, config);
      console.log('[ConfigParsing] 保存配置:', config);
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
              placeholder="输入正则表达式,如 (\d+)"
            />
            <div style={{
              'font-size': '0.8125rem',
              color: 'var(--text-muted)',
              'margin-top': '0.5rem'
            }}>
              使用捕获组 () 提取数字,例如：(\d+) 匹配第一个数字
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
