import { createSignal, createResource, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';
import ConfigBasicInfo from './ConfigBasicInfo';
import ConfigParsing from './ConfigParsing';
import ConfigAdvanced from './ConfigAdvanced';

/**
 * 播客配置编辑器 - 标签页设计
 *
 * 拆分为 3 个标签页:
 * 1. 基本信息 - 标题、描述、作者、封面
 * 2. 解析规则 - 文件名解析策略、时间策略
 * 3. 高级设置 - 邮箱、网站、语言、分类、explicit
 */
export default function ConfigEditor(props) {
  // 当前激活的标签
  const [activeTab, setActiveTab] = createSignal('basic');

  // 获取配置数据
  const [config, { refetch }] = createResource(() => props.podcast.id, podcastsAPI.getConfig);

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div
        class="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          'max-width': '720px',
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
          {/* 标签页导航 */}
          <div class="tabs" style={{
            display: 'flex',
            'border-bottom': '1px solid var(--border)',
            'margin-bottom': '0',
            gap: '0.5rem',
            padding: '0 2rem',
            background: 'white'
          }}>
            <button
              class={activeTab() === 'basic' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('basic')}
            >
              基本信息
            </button>
            <button
              class={activeTab() === 'parsing' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('parsing')}
            >
              解析规则
            </button>
            <button
              class={activeTab() === 'advanced' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('advanced')}
            >
              高级设置
            </button>
          </div>

          {/* 标签页内容 */}
          <div style={{
            flex: 1,
            'overflow-y': 'auto',
            padding: '1.5rem 2rem 2rem',
          }}>
            <Show when={activeTab() === 'basic'}>
              <ConfigBasicInfo
                podcast={props.podcast}
                config={config()}
                onRefresh={refetch}
              />
            </Show>
            <Show when={activeTab() === 'parsing'}>
              <ConfigParsing
                podcast={props.podcast}
                config={config()}
                onRefresh={refetch}
              />
            </Show>
            <Show when={activeTab() === 'advanced'}>
              <ConfigAdvanced
                podcast={props.podcast}
                config={config()}
                onRefresh={refetch}
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
