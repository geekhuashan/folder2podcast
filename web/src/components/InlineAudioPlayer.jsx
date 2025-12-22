/**
 * 行内音频播放器组件
 *
 * 功能：
 * - 嵌入在详情面板中的播放器，无需弹窗
 * - 显示音频文件名和播放控件
 * - 支持自动播放
 */

export default function InlineAudioPlayer(props) {
  return (
    <div style={{
      'border-radius': 'var(--radius-sm)',
      background: 'var(--surface-soft)',
      border: '1px solid var(--border)',
      padding: '1rem',
      'margin-bottom': '1.5rem'
    }}>
      {/* 播放器标题 */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem',
        'margin-bottom': '0.75rem'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
        <span style={{
          'font-weight': '600',
          'font-size': '0.9375rem',
          color: 'var(--text)'
        }}>
          音频预览
        </span>
      </div>

      {/* HTML5 音频控件 */}
      <audio
        controls
        autoplay
        style={{
          width: '100%',
          'border-radius': 'var(--radius-sm)',
          outline: 'none'
        }}
        src={props.audioUrl}
      >
        您的浏览器不支持音频播放
      </audio>

      {/* 文件名显示 */}
      <div style={{
        'margin-top': '0.75rem',
        'font-size': '0.8125rem',
        color: 'var(--text-muted)',
        'text-align': 'center',
        'font-family': 'monospace',
        background: 'rgba(255, 255, 255, 0.5)',
        padding: '0.5rem',
        'border-radius': 'var(--radius-sm)',
        'white-space': 'nowrap',
        overflow: 'hidden',
        'text-overflow': 'ellipsis'
      }}>
        🎵 {props.fileName}
      </div>
    </div>
  );
}
